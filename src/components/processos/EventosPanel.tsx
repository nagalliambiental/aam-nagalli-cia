"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/processos/StatusBadge";

type EventoItem = {
  id: number;
  data: Date;
  descricao: string;
  tipoEvento: { nome: string };
};

export function EventosPanel({
  processoId,
  eventos,
  tiposEvento,
}: {
  processoId: number;
  eventos: EventoItem[];
  tiposEvento: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const [tipoEventoId, setTipoEventoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/processos/${processoId}/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoEventoId, descricao, data }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao adicionar evento.");
      return;
    }
    setDescricao("");
    setShow(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Eventos"
        actions={
          <Button variant="secondary" onClick={() => setShow((s) => !s)}>
            {show ? "Cancelar" : "+ Evento"}
          </Button>
        }
      />

      {show && (
        <form onSubmit={handleAdd} className="space-y-3 border-b border-slate-200 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="tipoEventoId" required>Tipo</Label>
              <Select
                id="tipoEventoId"
                value={tipoEventoId}
                onChange={(e) => setTipoEventoId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {tiposEvento.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
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
            {loading ? "Salvando..." : "Adicionar evento"}
          </Button>
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {eventos.map((ev) => (
          <li key={ev.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-navy-900">{ev.descricao}</p>
                <p className="text-xs text-muted">{ev.tipoEvento.nome}</p>
              </div>
              <p className="text-xs text-muted">{formatDateTime(ev.data)}</p>
            </div>
          </li>
        ))}
        {eventos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhum evento registrado.
          </li>
        )}
      </ul>
    </Card>
  );
}
