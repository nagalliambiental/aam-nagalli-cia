"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/processos/StatusBadge";

type ExigenciaItem = {
  id: number;
  descricao: string;
  dataRecebimento: Date;
  prazoResposta: Date | null;
  status: string;
  orgao: { sigla: string };
};

export function ExigenciasPanel({
  processoId,
  exigencias,
}: {
  processoId: number;
  exigencias: ExigenciaItem[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [prazoResposta, setPrazoResposta] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/processos/${processoId}/exigencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao,
        prazoResposta: prazoResposta ? new Date(prazoResposta) : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao adicionar exigência.");
      return;
    }
    setDescricao("");
    setPrazoResposta("");
    setShow(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Exigências"
        actions={
          <Button variant="secondary" onClick={() => setShow((s) => !s)}>
            {show ? "Cancelar" : "+ Exigência"}
          </Button>
        }
      />

      {show && (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-200 p-5">
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
          <div className="max-w-xs">
            <Label htmlFor="prazoResposta">Prazo de resposta</Label>
            <Input
              id="prazoResposta"
              type="date"
              value={prazoResposta}
              onChange={(e) => setPrazoResposta(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Adicionar exigência"}
          </Button>
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {exigencias.map((ex) => (
          <li key={ex.id} className="flex items-start justify-between gap-4 px-5 py-3">
            <div>
              <p className="font-medium text-navy-900">{ex.descricao}</p>
              <p className="text-xs text-muted">
                {ex.orgao.sigla} · recebida {formatDate(ex.dataRecebimento)}
                {ex.prazoResposta ? ` · resposta até ${formatDate(ex.prazoResposta)}` : ""}
              </p>
            </div>
            <StatusBadge status={ex.status} />
          </li>
        ))}
        {exigencias.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhuma exigência.
          </li>
        )}
      </ul>
    </Card>
  );
}
