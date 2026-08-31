"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/processos/StatusBadge";

type CondicionanteItem = {
  id: number;
  codigo: string | null;
  descricao: string;
  periodicidade: string | null;
  proximoVencimento: Date | null;
  status: string;
  responsavel: { nome: string } | null;
};

export function CondicionantesPanel({
  licencaId,
  condicionantes,
}: {
  licencaId: number;
  condicionantes: CondicionanteItem[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodicidade, setPeriodicidade] = useState("");
  const [proximoVencimento, setProximoVencimento] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/licencas/${licencaId}/condicionantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo: codigo || null,
        descricao,
        periodicidade: periodicidade || null,
        proximoVencimento: proximoVencimento ? new Date(proximoVencimento) : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao adicionar condicionante.");
      return;
    }
    setCodigo("");
    setDescricao("");
    setPeriodicidade("");
    setProximoVencimento("");
    setShow(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Condicionantes"
        actions={
          <Button variant="secondary" onClick={() => setShow((s) => !s)}>
            {show ? "Cancelar" : "+ Condicionante"}
          </Button>
        }
      />

      {show && (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-200 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="periodicidade">Periodicidade</Label>
              <Input
                id="periodicidade"
                value={periodicidade}
                onChange={(e) => setPeriodicidade(e.target.value)}
                placeholder="ex.: anual"
              />
            </div>
            <div>
              <Label htmlFor="proximoVencimento">Próximo vencimento</Label>
              <Input
                id="proximoVencimento"
                type="date"
                value={proximoVencimento}
                onChange={(e) => setProximoVencimento(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="descricao" required>Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Adicionar condicionante"}
          </Button>
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {condicionantes.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 px-5 py-3">
            <div>
              <p className="font-medium text-navy-900">
                {c.codigo ? `${c.codigo} — ` : ""}{c.descricao}
              </p>
              <p className="text-xs text-muted">
                {c.periodicidade ? `${c.periodicidade}` : ""}
                {c.proximoVencimento ? ` · venc. ${formatDate(c.proximoVencimento)}` : ""}
                {c.responsavel ? ` · ${c.responsavel.nome}` : ""}
              </p>
            </div>
            <StatusBadge status={c.status} />
          </li>
        ))}
        {condicionantes.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhuma condicionante.
          </li>
        )}
      </ul>
    </Card>
  );
}
