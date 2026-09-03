"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { formatDate, formatDateTime, formatDateTimeLocal } from "@/lib/format";
import { Pencil, X, Trash2 } from "lucide-react";

type Tarefa = {
  id: number;
  titulo: string;
  descricao: string | null;
  prazoData: string | null;
  dataLimite: string | null;
  alertaDias: number | null;
  alertaDataLimite: number | null;
  prioridade: string;
  status: string;
  responsavelPessoaId: number | null;
  visibilidade: string;
  responsavelNome: string;
  processoLabel: string;
  empreendimentoId?: number | null;
  processoId?: number | null;
  dataConclusao?: string | null;
};

type EmpComProcessos = { id: number; nome: string; apelido?: string | null; processos: { id: number; numero: string }[] };

const STATUS_OPTS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Iniciada" },
  { value: "concluida", label: "Concluída" },
];
const PRIORIDADES = ["baixa", "media", "alta", "urgente"];

export function LinhaTarefa({
  tarefa,
  pessoas,
  empreendimentos = [],
  isAdmin = false,
  podeEditarTudo = false,
  podeExcluir = false,
}: {
  tarefa: Tarefa;
  pessoas: { id: number; nome: string }[];
  empreendimentos?: EmpComProcessos[];
  isAdmin?: boolean;
  podeEditarTudo?: boolean;
  podeExcluir?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
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
    empreendimentoId: tarefa.empreendimentoId != null ? String(tarefa.empreendimentoId) : "",
    processoId: tarefa.processoId != null ? String(tarefa.processoId) : "",
    dataConclusao: tarefa.dataConclusao ? formatDateTimeLocal(tarefa.dataConclusao) : "",
  });

  async function mudarStatus(v: string) {
    await fetch(`/api/tarefas/${tarefa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: v }),
    });
    router.refresh();
  }

  async function excluir() {
    if (!confirm(`Excluir a tarefa "${tarefa.titulo}"?`)) return;
    setLoading(true);
    const res = await fetch(`/api/tarefas/${tarefa.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.refresh();
  }

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
        empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
        processoId: form.processoId ? Number(form.processoId) : null,
        dataConclusao: form.dataConclusao || null,
      }),
    });
    setLoading(false);
    if (res.ok) { setOpenEdit(false); router.refresh(); }
  }

  const empreendimentoSel = empreendimentos.find((e) => e.id === Number(form.empreendimentoId));

  return (
    <div className="px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-navy-900">
            {tarefa.titulo} <span className="text-muted font-normal">- {tarefa.responsavelNome}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {tarefa.dataLimite ? `Data Limite: ${formatDate(new Date(tarefa.dataLimite))}` : ""}
            {tarefa.dataLimite && tarefa.prazoData ? "   " : ""}
            {tarefa.prazoData ? `Prazo Final: ${formatDate(new Date(tarefa.prazoData))}` : ""}
            {!tarefa.dataLimite && !tarefa.prazoData ? "—" : ""}
          </p>
          <p className="text-xs text-muted">{tarefa.processoLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {tarefa.status === "concluida" && tarefa.dataConclusao && (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              Concluída em: {formatDateTime(tarefa.dataConclusao)}
            </span>
          )}
          <Select value={tarefa.status} onChange={(e) => mudarStatus(e.target.value)} className="w-32 text-xs" style={{ borderColor: "#2563eb", color: "#2563eb" }}>
            {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          {podeEditarTudo && (
            <button type="button" onClick={() => setOpenEdit((o) => !o)} title="Edição rápida" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" style={{ color: "#16a34a" }}>
              {openEdit ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
          )}
          {podeExcluir && (
            <button type="button" onClick={excluir} disabled={loading} title="Excluir" className="rounded-md p-1.5 text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {openEdit && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-navy-900">Edição rápida</span>
            <button type="button" onClick={() => setOpenEdit(false)} className="rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>
          {podeEditarTudo ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor={`lt-${tarefa.id}`} required>Título</Label>
                <Input id={`lt-${tarefa.id}`} value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor={`ld-${tarefa.id}`}>Descrição</Label>
                <Textarea id={`ld-${tarefa.id}`} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor={`lp-${tarefa.id}`}>Prazo Final</Label>
                  <Input id={`lp-${tarefa.id}`} type="date" value={form.prazoData} onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`lap-${tarefa.id}`}>Alerta (dias)</Label>
                  <Input id={`lap-${tarefa.id}`} type="number" min="1" value={form.alertaDias} onChange={(e) => setForm((f) => ({ ...f, alertaDias: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`ll-${tarefa.id}`}>Data Limite</Label>
                  <Input id={`ll-${tarefa.id}`} type="date" value={form.dataLimite} onChange={(e) => setForm((f) => ({ ...f, dataLimite: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`lal-${tarefa.id}`}>Alerta (dias)</Label>
                  <Input id={`lal-${tarefa.id}`} type="number" min="1" value={form.alertaDataLimite} onChange={(e) => setForm((f) => ({ ...f, alertaDataLimite: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`lpr-${tarefa.id}`}>Prioridade</Label>
                  <Select id={`lpr-${tarefa.id}`} value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}>
                    {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`lr-${tarefa.id}`}>Responsável pela Execução</Label>
                  <Select id={`lr-${tarefa.id}`} value={form.responsavelPessoaId} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))}>
                    {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`ls-${tarefa.id}`}>Status</Label>
                  <Select id={`ls-${tarefa.id}`} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </div>
                {form.status === "concluida" && (
                  <div>
                    <Label htmlFor={`lc-${tarefa.id}`}>Data de conclusão</Label>
                    <Input id={`lc-${tarefa.id}`} type="datetime-local" value={form.dataConclusao} onChange={(e) => setForm((f) => ({ ...f, dataConclusao: e.target.value }))} />
                  </div>
                )}
                {isAdmin && (
                  <div>
                    <Label htmlFor={`lv-${tarefa.id}`}>Visibilidade</Label>
                    <Select id={`lv-${tarefa.id}`} value={form.visibilidade} onChange={(e) => setForm((f) => ({ ...f, visibilidade: e.target.value }))}>
                      <option value="publico">Público</option>
                      <option value="privado">Privado</option>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor={`le-${tarefa.id}`}>Empreendimento</Label>
                  <Select id={`le-${tarefa.id}`} value={form.empreendimentoId} onChange={(e) => setForm((f) => ({ ...f, empreendimentoId: e.target.value, processoId: "" }))}>
                    <option value="">— sem empreendimento —</option>
                    {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.nome}{e.apelido ? ` (${e.apelido})` : ""}</option>)}
                  </Select>
                </div>
                {empreendimentoSel && (
                  <div>
                    <Label htmlFor={`lp2-${tarefa.id}`}>Processo</Label>
                    <Select id={`lp2-${tarefa.id}`} value={form.processoId} onChange={(e) => setForm((f) => ({ ...f, processoId: e.target.value }))}>
                      <option value="">— sem processo —</option>
                      {empreendimentoSel.processos.map((p) => <option key={p.id} value={p.id}>{p.numero}</option>)}
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="sm:max-w-xs">
                <Label htmlFor={`rq-${tarefa.id}`}>Status</Label>
                <Select id={`rq-${tarefa.id}`} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              {form.status === "concluida" && (
                <div className="sm:max-w-xs">
                  <Label htmlFor={`rc-${tarefa.id}`}>Data de conclusão</Label>
                  <Input id={`rc-${tarefa.id}`} type="datetime-local" value={form.dataConclusao} onChange={(e) => setForm((f) => ({ ...f, dataConclusao: e.target.value }))} />
                </div>
              )}
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpenEdit(false)}>Cancelar</Button>
            <Button type="button" onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
