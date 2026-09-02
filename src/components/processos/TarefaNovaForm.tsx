"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function TarefaNovaForm({
  pessoas,
  processos,
  onClose,
}: {
  pessoas: { id: number; nome: string }[];
  processos: { id: number; numero: string; nup: string | null }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    prazoData: "",
    alertaDias: "30",
    responsavelPessoaId: pessoas[0]?.id ?? "",
    processoId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
        processoId: form.processoId ? Number(form.processoId) : null,
        prazoData: form.prazoData ? new Date(form.prazoData) : null,
        alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : 30,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao criar tarefa.");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-200 bg-slate-50 p-5">
      <div>
        <Label htmlFor="titulo" required>Título</Label>
        <Input id="titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} required />
      </div>
      <div>
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="responsavelPessoaId" required>Responsável</Label>
          <Select id="responsavelPessoaId" value={String(form.responsavelPessoaId)} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value as unknown as number }))} required>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="processoId">Processo</Label>
          <Select id="processoId" value={form.processoId} onChange={(e) => setForm((f) => ({ ...f, processoId: e.target.value }))}>
            <option value="">— sem processo —</option>
            {processos.map((p) => <option key={p.id} value={p.id}>{p.numero}{p.nup ? ` (${p.nup})` : ""}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="prazoData">Prazo</Label>
          <Input id="prazoData" type="date" value={form.prazoData} onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="alertaDias">Alerta (dias antes do vencimento)</Label>
          <Input id="alertaDias" type="number" min="1" value={form.alertaDias} onChange={(e) => setForm((f) => ({ ...f, alertaDias: e.target.value }))} />
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
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Criar tarefa"}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  );
}
