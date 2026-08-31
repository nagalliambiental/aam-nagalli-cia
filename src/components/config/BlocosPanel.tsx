"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea, Card, Badge } from "@/components/ui";

type Bloco = {
  id: number;
  fase: string;
  nome: string;
  descricao: string;
  prazoDias: number;
  unidade: string;
  responsavelPessoaId: number | null;
  responsavel: { nome: string } | null;
  ordem: number;
  ativo: boolean;
};

export function BlocosPanel({ blocos, pessoas, fases }: { blocos: Bloco[]; pessoas: { id: number; nome: string }[]; fases: string[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Bloco | null>(null);
  const [form, setForm] = useState({ fase: fases[0], nome: "", descricao: "", prazoDias: "30", unidade: "corridos", responsavelPessoaId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(b: Bloco) {
    setEditing(b);
    setForm({ fase: b.fase, nome: b.nome, descricao: b.descricao, prazoDias: String(b.prazoDias), unidade: b.unidade, responsavelPessoaId: b.responsavelPessoaId ? String(b.responsavelPessoaId) : "" });
    setShow(true);
  }

  function startCreate() {
    setEditing(null);
    setForm({ fase: fases[0], nome: "", descricao: "", prazoDias: "30", unidade: "corridos", responsavelPessoaId: "" });
    setShow(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      fase: form.fase,
      nome: form.nome,
      descricao: form.descricao,
      prazoDias: Number(form.prazoDias),
      unidade: form.unidade,
      responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
    };
    const res = await fetch(editing ? `/api/blocos-exigencia/${editing.id}` : "/api/blocos-exigencia", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "Erro ao salvar."); return; }
    setShow(false);
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("Desativar este bloco?")) return;
    await fetch(`/api/blocos-exigencia/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const grouped = fases.map((f) => ({ fase: f, itens: blocos.filter((b) => b.fase === f && b.ativo) }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={startCreate}>Novo bloco</Button>
      </div>

      {show && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="fase" required>Fase</Label>
              <Select id="fase" value={form.fase} onChange={(e) => setForm((f) => ({ ...f, fase: e.target.value }))} required>
                {fases.map((fa) => <option key={fa} value={fa}>{fa}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="prazoDias" required>Prazo (dias)</Label>
              <Input id="prazoDias" type="number" min="1" value={form.prazoDias} onChange={(e) => setForm((f) => ({ ...f, prazoDias: e.target.value }))} required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="nome" required>Nome do bloco</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required placeholder="Ex.: Protocolo REPEM" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="descricao" required>Descrição</Label>
              <Textarea id="descricao" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} required rows={2} />
            </div>
            <div>
              <Label htmlFor="unidade">Unidade</Label>
              <Select id="unidade" value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}>
                <option value="corridos">Dias corridos</option>
                <option value="uteis">Dias úteis</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="responsavel">Responsável padrão</Label>
              <Select id="responsavel" value={form.responsavelPessoaId} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))}>
                <option value="">— sem responsável —</option>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {grouped.map((g) => (
        <div key={g.fase}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
            {g.fase} <Badge tone="blue">{g.itens.length} blocos</Badge>
          </h3>
          {g.itens.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-muted">Nenhum bloco nesta fase.</p>
          ) : (
            <ul className="space-y-2">
              {g.itens.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-900">{b.nome} <span className="text-xs font-normal text-muted">· {b.prazoDias} {b.unidade}</span></p>
                    <p className="text-sm text-muted">{b.descricao}</p>
                    {b.responsavel && <p className="text-xs text-muted">Resp.: {b.responsavel.nome}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" onClick={() => startEdit(b)}>Editar</Button>
                    <Button variant="ghost" onClick={() => handleDelete(b.id)}>Excluir</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
