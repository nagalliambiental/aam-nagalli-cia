"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui";

type TarefaItem = {
  id: number;
  titulo: string;
  prioridade: string;
  status: string;
  prazoData: Date | null;
  responsavel: { nome: string };
};

export function TarefasPanel({
  processoId,
  tarefas,
  pessoas,
}: {
  processoId: number;
  tarefas: TarefaItem[];
  pessoas: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    prioridade: "media",
    prazoData: "",
    responsavelPessoaId: pessoas[0]?.id ?? "",
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
        responsavelPessoaId: form.responsavelPessoaId
          ? Number(form.responsavelPessoaId)
          : null,
        prazoData: form.prazoData ? new Date(form.prazoData) : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao adicionar tarefa.");
      return;
    }
    setForm((f) => ({ ...f, titulo: "" }));
    setShow(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Tarefas"
        actions={
          <Button variant="secondary" onClick={() => setShow((s) => !s)}>
            {show ? "Cancelar" : "+ Tarefa"}
          </Button>
        }
      />

      {show && (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-200 p-5">
          <div>
            <Label htmlFor="titulo" required>Título</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                id="prioridade"
                value={form.prioridade}
                onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="prazoData">Prazo</Label>
              <Input
                id="prazoData"
                type="date"
                value={form.prazoData}
                onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="responsavelPessoaId">Responsável</Label>
              <Select
                id="responsavelPessoaId"
                value={String(form.responsavelPessoaId)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    responsavelPessoaId: e.target.value as unknown as number,
                  }))
                }
                required
              >
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Adicionar tarefa"}
          </Button>
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {tarefas.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="font-medium text-navy-900">{t.titulo}</p>
              <p className="text-xs text-muted">
                {t.responsavel.nome}
                {t.prazoData ? ` · prazo ${formatDate(t.prazoData)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={t.status === "concluida" ? "green" : t.status === "em_andamento" ? "blue" : "amber"}>
                {t.status}
              </Badge>
              <Badge tone={t.prioridade === "alta" || t.prioridade === "urgente" ? "red" : "gray"}>
                {t.prioridade}
              </Badge>
            </div>
          </li>
        ))}
        {tarefas.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhuma tarefa.
          </li>
        )}
      </ul>
    </Card>
  );
}
