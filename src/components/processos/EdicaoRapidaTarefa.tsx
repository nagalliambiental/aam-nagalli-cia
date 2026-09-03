"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { Pencil, X } from "lucide-react";

type TarefaRapida = {
  id: number;
  titulo: string;
  descricao: string | null;
  prazoData: string | null;
  alertaDias: number | null;
  dataLimite: string | null;
  alertaDataLimite: number | null;
  prioridade: string;
  status: string;
  responsavelPessoaId: number | null;
  visibilidade: string;
};

const PRIORIDADES = ["baixa", "media", "alta", "urgente"];
const STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Iniciada" },
  { value: "concluida", label: "Concluída" },
];

export function EdicaoRapidaTarefa({
  tarefa,
  pessoas,
  isAdmin = false,
  podeEditarTudo = false,
}: {
  tarefa: TarefaRapida;
  pessoas: { id: number; nome: string }[];
  isAdmin?: boolean;
  podeEditarTudo?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: tarefa.titulo,
    descricao: tarefa.descricao ?? "",
    prazoData: tarefa.prazoData ?? "",
    alertaDias: tarefa.alertaDias != null ? String(tarefa.alertaDias) : "",
    dataLimite: tarefa.dataLimite ?? "",
    alertaDataLimite: tarefa.alertaDataLimite != null ? String(tarefa.alertaDataLimite) : "",
    prioridade: tarefa.prioridade,
    status: tarefa.status,
    responsavelPessoaId: tarefa.responsavelPessoaId != null ? String(tarefa.responsavelPessoaId) : "",
    visibilidade: tarefa.visibilidade,
  });

  async function salvar() {
    setLoading(true);
    const res = await fetch(`/api/tarefas/${tarefa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        descricao: form.descricao,
        prazoData: form.prazoData || null,
        alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : null,
        dataLimite: form.dataLimite || null,
        alertaDataLimite: form.alertaDataLimite !== "" ? Number(form.alertaDataLimite) : null,
        prioridade: form.prioridade,
        status: form.status,
        responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
        visibilidade: form.visibilidade,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  const toggle = (open: boolean) => {
    setOpen(open);
    // sincroniza o form com os dados mais recentes ao abrir
    if (open) {
      setForm({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao ?? "",
        prazoData: tarefa.prazoData ?? "",
        alertaDias: tarefa.alertaDias != null ? String(tarefa.alertaDias) : "",
        dataLimite: tarefa.dataLimite ?? "",
        alertaDataLimite: tarefa.alertaDataLimite != null ? String(tarefa.alertaDataLimite) : "",
        prioridade: tarefa.prioridade,
        status: tarefa.status,
        responsavelPessoaId: tarefa.responsavelPessoaId != null ? String(tarefa.responsavelPessoaId) : "",
        visibilidade: tarefa.visibilidade,
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => toggle(!open)}
        title="Edição rápida"
        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" /> Edição rápida
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy-900">Editar tarefa</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>
          {podeEditarTudo ? (
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor={`qt-${tarefa.id}`} required>Título</Label>
                <Input id={`qt-${tarefa.id}`} value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor={`qd-${tarefa.id}`}>Descrição</Label>
                <Textarea id={`qd-${tarefa.id}`} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`qp-${tarefa.id}`}>Prazo Final</Label>
                  <Input id={`qp-${tarefa.id}`} type="date" value={form.prazoData} onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`qap-${tarefa.id}`}>Alerta (dias)</Label>
                  <Input id={`qap-${tarefa.id}`} type="number" min="1" value={form.alertaDias} onChange={(e) => setForm((f) => ({ ...f, alertaDias: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`ql-${tarefa.id}`}>Data Limite</Label>
                  <Input id={`ql-${tarefa.id}`} type="date" value={form.dataLimite} onChange={(e) => setForm((f) => ({ ...f, dataLimite: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`qal-${tarefa.id}`}>Alerta (dias)</Label>
                  <Input id={`qal-${tarefa.id}`} type="number" min="1" value={form.alertaDataLimite} onChange={(e) => setForm((f) => ({ ...f, alertaDataLimite: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`qpr-${tarefa.id}`}>Prioridade</Label>
                  <Select id={`qpr-${tarefa.id}`} value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}>
                    {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`qr-${tarefa.id}`}>Responsável pela Execução</Label>
                  <Select id={`qr-${tarefa.id}`} value={form.responsavelPessoaId} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))}>
                    {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`qs-${tarefa.id}`}>Status</Label>
                  <Select id={`qs-${tarefa.id}`} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </div>
                {isAdmin && (
                  <div>
                    <Label htmlFor={`qv-${tarefa.id}`}>Visibilidade</Label>
                    <Select id={`qv-${tarefa.id}`} value={form.visibilidade} onChange={(e) => setForm((f) => ({ ...f, visibilidade: e.target.value }))}>
                      <option value="publico">Público</option>
                      <option value="privado">Privado</option>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <Label htmlFor={`qs2-${tarefa.id}`}>Status</Label>
              <Select id={`qs2-${tarefa.id}`} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      )}
    </>
  );
}
