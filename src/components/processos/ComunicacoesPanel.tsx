"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";

type ComunicacaoItem = {
  id: number;
  tipo: string;
  data: Date;
  remetente: string | null;
  destinatario: string | null;
  assunto: string | null;
  descricao: string | null;
  status: string;
};

export function ComunicacoesPanel({
  processoId,
  comunicacoes,
}: {
  processoId: number;
  comunicacoes: ComunicacaoItem[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: "email",
    data: new Date().toISOString().slice(0, 10),
    remetente: "",
    destinatario: "",
    assunto: "",
    descricao: "",
    status: "enviada",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/processos/${processoId}/comunicacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        data: form.data ? new Date(form.data) : null,
        remetente: form.remetente || null,
        destinatario: form.destinatario || null,
        assunto: form.assunto || null,
        descricao: form.descricao || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao registrar comunicação.");
      return;
    }
    setForm((f) => ({ ...f, remetente: "", destinatario: "", assunto: "", descricao: "" }));
    setShow(false);
    router.refresh();
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Card>
      <CardHeader
        title="Comunicações"
        actions={
          <Button variant="secondary" onClick={() => setShow((s) => !s)}>
            {show ? "Cancelar" : "+ Comunicação"}
          </Button>
        }
      />

      {show && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-b border-slate-200 p-5 md:grid-cols-4">
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select id="tipo" value={form.tipo} onChange={set("tipo")}>
              <option value="email">E-mail</option>
              <option value="oficio">Ofício</option>
              <option value="protocolo">Protocolo</option>
              <option value="solicitacao">Solicitação</option>
              <option value="interna">Comunicação interna</option>
              <option value="orgao">Comunicação com órgão</option>
              <option value="reuniao">Reunião</option>
              <option value="ligacao">Ligação</option>
              <option value="outro">Outro</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={form.data} onChange={set("data")} />
          </div>
          <div>
            <Label htmlFor="remetente">Remetente</Label>
            <Input id="remetente" value={form.remetente} onChange={set("remetente")} />
          </div>
          <div>
            <Label htmlFor="destinatario">Destinatário</Label>
            <Input id="destinatario" value={form.destinatario} onChange={set("destinatario")} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="assunto">Assunto</Label>
            <Input id="assunto" value={form.assunto} onChange={set("assunto")} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={set("status")}>
              <option value="enviada">Enviada</option>
              <option value="recebida">Recebida</option>
              <option value="respondida">Respondida</option>
              <option value="rascunho">Rascunho</option>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={form.descricao} onChange={set("descricao")} rows={2} />
          </div>
          <div className="md:col-span-4 flex items-center gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Registrar comunicação"}
            </Button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {comunicacoes.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-navy-900">
                {c.assunto ?? "Comunicação"}
                {c.tipo && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">{c.tipo}</span>}
              </p>
              <p className="text-xs text-muted">
                {formatDate(c.data)}
                {(c.remetente || c.destinatario) && ` · ${c.remetente ?? "—"} → ${c.destinatario ?? "—"}`}
              </p>
              {c.descricao && <p className="mt-1 text-sm text-muted">{c.descricao}</p>}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              c.status === "respondida" ? "bg-green-100 text-green-700"
              : c.status === "rascunho" ? "bg-slate-100 text-slate-600"
              : "bg-blue-100 text-blue-700"
            }`}>
              {c.status}
            </span>
          </li>
        ))}
        {comunicacoes.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhuma comunicação registrada.
          </li>
        )}
      </ul>
    </Card>
  );
}
