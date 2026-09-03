"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Modal } from "@/components/ui";
import { formatMoney, parseNumberBR } from "@/lib/format";
import { Pencil, Trash2, Plus } from "lucide-react";

type Servico = { id: number; nome: string; descricao: string | null; valorUnitario: number; unidade: string };

const UNIDADES = ["und", "horas", "diária", "m²", "km", "kg", "ton"];

export function ServicosManager({ servicos }: { servicos: Servico[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<Servico[]>(servicos);
  const [openForm, setOpenForm] = useState(false);
  const [edit, setEdit] = useState<Servico | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", valorUnitario: "", unidade: "und" });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const url = edit ? `/api/servicos/${edit.id}` : "/api/servicos";
    const res = await fetch(url, {
      method: edit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valorUnitario: parseNumberBR(form.valorUnitario) }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "Erro ao salvar."); return; }
    setOpenForm(false);
    setEdit(null);
    setForm({ nome: "", descricao: "", valorUnitario: "", unidade: "und" });
    router.refresh();
  }

  async function excluir(s: Servico) {
    if (!confirm(`Excluir o serviço "${s.nome}"?`)) return;
    await fetch(`/api/servicos/${s.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="secondary" onClick={() => { setEdit(null); setForm({ nome: "", descricao: "", valorUnitario: "", unidade: "und" }); setOpenForm(true); }}>
          <Plus className="h-4 w-4" /> Novo serviço
        </Button>
      </div>

      <Card>
        <ul className="divide-y divide-slate-100">
          {itens.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="font-medium text-navy-900">{s.nome}</p>
                <p className="text-xs text-muted">
                  {formatMoney(s.valorUnitario)} · un: {s.unidade}
                  {s.descricao ? ` · ${s.descricao}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => { setEdit(s); setForm({ nome: s.nome, descricao: s.descricao ?? "", valorUnitario: String(s.valorUnitario), unidade: s.unidade }); setOpenForm(true); }} title="Editar" className="rounded p-2 text-slate-400 hover:text-navy-700">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => excluir(s)} title="Excluir" className="rounded p-2 text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {itens.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted">Nenhum serviço cadastrado.</li>
          )}
        </ul>
      </Card>

      <Modal open={openForm} title={edit ? "Editar serviço" : "Novo serviço"} onClose={() => setOpenForm(false)}>
        <form onSubmit={salvar} className="space-y-3">
          <div>
            <Label htmlFor="snome" required>Nome</Label>
            <Input id="snome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="svalor" required>Valor unitário (R$)</Label>
              <Input id="svalor" type="text" inputMode="decimal" placeholder="0,00" value={form.valorUnitario} onChange={(e) => setForm((f) => ({ ...f, valorUnitario: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="sunidade">Unidade</Label>
              <Select id="sunidade" value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="sdesc">Descrição</Label>
            <Input id="sdesc" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
