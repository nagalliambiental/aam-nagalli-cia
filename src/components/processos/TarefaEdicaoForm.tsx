"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { CheckCircle2, RotateCcw } from "lucide-react";

type EmpreendimentoComProcessos = { id: number; nome: string; apelido?: string | null; processos: { id: number; numero: string }[] };

const PRIORIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export function TarefaEdicaoForm({
  tarefaId,
  pessoas,
  empreendimentos,
  initial,
}: {
  tarefaId: number;
  pessoas: { id: number; nome: string }[];
  empreendimentos: EmpreendimentoComProcessos[];
  initial: {
    titulo: string;
    descricao: string | null;
    observacoes: string | null;
    status: string;
    prioridade: string;
    responsavelPessoaId: number | null;
    empreendimentoId: number | null;
    processoId: number | null;
    prazoData: string | null;
    alertaDias: number | null;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    titulo: initial.titulo,
    descricao: initial.descricao ?? "",
    observacoes: initial.observacoes ?? "",
    status: initial.status,
    prioridade: initial.prioridade,
    responsavelPessoaId: initial.responsavelPessoaId != null ? String(initial.responsavelPessoaId) : "",
    empreendimentoId: initial.empreendimentoId != null ? String(initial.empreendimentoId) : "",
    processoId: initial.processoId != null ? String(initial.processoId) : "",
    prazoData: initial.prazoData ?? "",
    alertaDias: initial.alertaDias != null ? String(initial.alertaDias) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empreendimento = empreendimentos.find((e) => e.id === Number(form.empreendimentoId));
  const concluida = form.status === "concluida";

  async function salvar(overrideStatus?: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/tarefas/${tarefaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        descricao: form.descricao,
        observacoes: form.observacoes,
        prioridade: form.prioridade,
        responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
        empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
        processoId: form.processoId ? Number(form.processoId) : null,
        prazoData: form.prazoData ? new Date(form.prazoData) : null,
        alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : null,
        ...(overrideStatus ? { status: overrideStatus } : {}),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Erro ao salvar tarefa.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); salvar(); }} className="space-y-4 p-5">
      <div>
        <Label htmlFor="titulo" required>Título</Label>
        <Input id="titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} required />
      </div>
      <div>
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={3} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="responsavelPessoaId" required>Responsável</Label>
          <Select id="responsavelPessoaId" value={form.responsavelPessoaId} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))} required>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="prioridade">Prioridade</Label>
          <Select id="prioridade" value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}>
            {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="empreendimentoId">Empreendimento</Label>
          <Select id="empreendimentoId" value={form.empreendimentoId} onChange={(e) => setForm((f) => ({ ...f, empreendimentoId: e.target.value, processoId: "" }))}>
            <option value="">— sem empreendimento —</option>
            {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.apelido || e.nome}</option>)}
          </Select>
        </div>
        {empreendimento && (
          <div>
            <Label htmlFor="processoId">Processo</Label>
            <Select id="processoId" value={form.processoId} onChange={(e) => setForm((f) => ({ ...f, processoId: e.target.value }))}>
              <option value="">— sem processo —</option>
              {empreendimento.processos.map((p) => <option key={p.id} value={p.id}>{p.numero}</option>)}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="prazoData">Prazo</Label>
          <Input id="prazoData" type="date" value={form.prazoData} onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="alertaDias">Alerta (dias antes do vencimento)</Label>
          <Input id="alertaDias" type="number" min="1" value={form.alertaDias} onChange={(e) => setForm((f) => ({ ...f, alertaDias: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</Button>
        <Button
          type="button"
          variant={concluida ? "secondary" : "primary"}
          disabled={loading}
          onClick={() => salvar(concluida ? "pendente" : "concluida")}
        >
          {concluida ? (
            <><RotateCcw className="mr-1 h-4 w-4" /> Reabrir</>
          ) : (
            <><CheckCircle2 className="mr-1 h-4 w-4" /> Concluir</>
          )}
        </Button>
      </div>
    </form>
  );
}
