"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Modal, Select, Textarea } from "@/components/ui";

export function CriarTarefaCondicionante({ condicionanteId, licencaId, processoId, empreendimentoId, titulo, descricao, prazoInicial, pessoas }: { condicionanteId: number; licencaId: number; processoId: number | null; empreendimentoId: number | null; titulo: string; descricao: string; prazoInicial: string; pessoas: { id: number; nome: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [responsavel, setResponsavel] = useState(pessoas[0] ? String(pessoas[0].id) : "");
  const [prazo, setPrazo] = useState(prazoInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    const response = await fetch("/api/tarefas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo, descricao, responsavelPessoaId: Number(responsavel), processoId, empreendimentoId, licencaId, condicionanteId, prazoData: prazo || null }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "Erro ao criar tarefa."); setLoading(false); return; }
    setOpen(false); setLoading(false); router.refresh();
  }
  return <><Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => setOpen(true)}>Criar tarefa</Button><Modal open={open} title="Nova tarefa da exigência" onClose={() => setOpen(false)}><form onSubmit={submit} className="space-y-3"><div><Label>Título</Label><Input value={titulo} readOnly /></div><div><Label>Descrição</Label><Textarea value={descricao} readOnly rows={3} /></div><div><Label htmlFor={`cond-resp-${condicionanteId}`} required>Responsável</Label><Select id={`cond-resp-${condicionanteId}`} value={responsavel} onChange={(e) => setResponsavel(e.target.value)} required>{pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Select></div><div><Label htmlFor={`cond-prazo-${condicionanteId}`}>Prazo</Label><Input id={`cond-prazo-${condicionanteId}`} type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>{error && <p className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={loading || !responsavel}>{loading ? "Criando..." : "Criar tarefa"}</Button></div></form></Modal></>;
}
