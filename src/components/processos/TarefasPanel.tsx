"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { ImportarTarefasPdf } from "@/components/processos/ImportarTarefasPdf";

type TarefaItem = { id: number; titulo: string; prioridade: string; status: string; prazoData: Date | null; responsavel: { nome: string } };
type PrazoItem = { id: number; descricao: string; dataCalculadaAtual: Date | null };

export function TarefasPanel({
  processoId,
  tarefas,
  prazos = [],
  pessoas,
  isAdmin = false,
}: {
  processoId: number;
  tarefas: TarefaItem[];
  prazos?: PrazoItem[];
  pessoas: { id: number; nome: string }[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    prazoData: "",
    alertaDias: "30",
    dataLimite: "",
    alertaDataLimite: "",
    prioridade: "media",
    status: "pendente",
    responsavelPessoaId: pessoas[0]?.id ? String(pessoas[0].id) : "",
    visibilidade: "publico",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/processos/${processoId}/tarefas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
        prazoData: form.prazoData || null,
        dataLimite: form.dataLimite || null,
        alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : 30,
        alertaDataLimite: form.alertaDataLimite !== "" ? Number(form.alertaDataLimite) : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "Erro ao adicionar tarefa."); return; }
    setForm((f) => ({ ...f, titulo: "", descricao: "" }));
    setShow(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Tarefas e Prazos"
        actions={
          <div className="flex items-center gap-2">
            <ImportarTarefasPdf processoId={processoId} responsaveis={pessoas} />
            <Button variant="secondary" onClick={() => setShow((s) => !s)}>
              {show ? "Cancelar" : "+ Tarefa"}
            </Button>
          </div>
        }
      />

      {show && (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-200 p-5">
          <div>
            <Label htmlFor="titulo" required>Título</Label>
            <Input id="titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="prazoData">Prazo Final</Label>
              <Input id="prazoData" type="date" value={form.prazoData} onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="alertaDias">Alerta (dias antes)</Label>
              <Input id="alertaDias" type="number" min="1" value={form.alertaDias} onChange={(e) => setForm((f) => ({ ...f, alertaDias: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dataLimite">Data Limite</Label>
              <Input id="dataLimite" type="date" value={form.dataLimite} onChange={(e) => setForm((f) => ({ ...f, dataLimite: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="alertaDataLimite">Alerta (dias antes)</Label>
              <Input id="alertaDataLimite" type="number" min="1" value={form.alertaDataLimite} onChange={(e) => setForm((f) => ({ ...f, alertaDataLimite: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select id="prioridade" value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="responsavelPessoaId">Responsável pela Execução</Label>
              <Select id="responsavelPessoaId" value={String(form.responsavelPessoaId)} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))} required>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Iniciada</option>
                <option value="concluida">Concluída</option>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <Label htmlFor="visibilidade">Visibilidade</Label>
                <Select id="visibilidade" value={form.visibilidade} onChange={(e) => setForm((f) => ({ ...f, visibilidade: e.target.value }))}>
                  <option value="publico">Público</option>
                  <option value="privado">Privado</option>
                </Select>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Adicionar tarefa"}</Button>
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {tarefas.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-navy-900">{t.titulo} <span className="text-muted font-normal">· {t.responsavel.nome}</span></p>
              <p className="text-xs text-muted">{t.prazoData ? `Prazo ${formatDate(t.prazoData)}` : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={t.status === "concluida" ? "green" : t.status === "em_andamento" ? "blue" : "amber"}>{t.status === "concluida" ? "Concluída" : t.status === "em_andamento" ? "Iniciada" : "Pendente"}</Badge>
            </div>
          </li>
        ))}
        {tarefas.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Nenhuma tarefa.</li>}
      </ul>

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Prazos</p>
        <ul className="divide-y divide-slate-100">
          {prazos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-2">
              <p className="text-sm text-navy-900">{p.descricao}</p>
              <span className="text-xs text-muted">{p.dataCalculadaAtual ? formatDate(p.dataCalculadaAtual) : "—"}</span>
            </li>
          ))}
          {prazos.length === 0 && <li className="py-4 text-center text-sm text-muted">Nenhum prazo cadastrado.</li>}
        </ul>
      </div>
    </Card>
  );
}
