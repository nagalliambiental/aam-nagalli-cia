"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Modal, Select, Textarea } from "@/components/ui";
import { Plus } from "lucide-react";

export function CriarTarefaNotificacao({
  notificacaoId = null,
  mensagem,
  processoId,
  processoNumero,
  pessoas,
  isAdmin = false,
}: {
  notificacaoId?: number | null;
  mensagem: string;
  processoId: number | null;
  processoNumero: string | null;
  pessoas: { id: number; nome: string }[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: mensagem.slice(0, 90),
    descricao: mensagem,
    responsavelPessoaId: pessoas[0]?.id ? String(pessoas[0].id) : "",
    prazoData: "",
    alertaDias: "30",
    prioridade: "media",
    visibilidade: "publico",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        descricao: form.descricao,
        responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
        processoId,
        prazoData: form.prazoData || null,
        alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : 30,
        prioridade: form.prioridade,
        visibilidade: form.visibilidade,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(d.error ?? "Erro ao criar tarefa.");
      return;
    }
    if (notificacaoId) {
      await fetch(`/api/notificacoes/${notificacaoId}/lida`, { method: "POST" }).catch(() => {});
    }
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="px-2 py-1 text-xs">
        <Plus className="h-3.5 w-3.5" /> Criar tarefa
      </Button>
      <Modal open={open} title="Nova tarefa a partir do aviso" onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {processoNumero && <p className="text-xs text-muted">Vinculada ao processo {processoNumero}.</p>}
          <div>
            <Label htmlFor="nt-titulo" required>Título</Label>
            <Input id="nt-titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="nt-desc">Descrição</Label>
            <Textarea id="nt-desc" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nt-resp" required>Responsável pela Execução</Label>
              <Select id="nt-resp" value={form.responsavelPessoaId} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))} required>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="nt-prazo">Prazo</Label>
              <Input id="nt-prazo" type="date" value={form.prazoData} onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="nt-prio">Prioridade</Label>
              <Select id="nt-prio" value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <Label htmlFor="nt-vis">Visibilidade</Label>
                <Select id="nt-vis" value={form.visibilidade} onChange={(e) => setForm((f) => ({ ...f, visibilidade: e.target.value }))}>
                  <option value="publico">Público</option>
                  <option value="privado">Privado</option>
                </Select>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar tarefa"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
