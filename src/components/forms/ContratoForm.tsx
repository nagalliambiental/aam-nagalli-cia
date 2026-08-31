"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";

export function ContratoForm({
  empresas,
  initial,
  contratoId,
}: {
  empresas: { id: number; nome: string }[];
  initial?: {
    empresaId?: number;
    numero?: string;
    descricao?: string;
    dataAssinatura?: string;
    dataValidade?: string;
    observacoes?: string;
  };
  contratoId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    empresaId: String(initial?.empresaId ?? empresas[0]?.id ?? ""),
    numero: initial?.numero ?? "",
    descricao: initial?.descricao ?? "",
    dataAssinatura: initial?.dataAssinatura ?? "",
    dataValidade: initial?.dataValidade ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...form,
      empresaId: Number(form.empresaId),
      numero: form.numero || null,
      descricao: form.descricao || null,
      dataAssinatura: form.dataAssinatura ? new Date(form.dataAssinatura) : null,
      dataValidade: form.dataValidade ? new Date(form.dataValidade) : null,
      observacoes: form.observacoes || null,
    };

    const res = await fetch(contratoId ? `/api/contratos/${contratoId}` : "/api/contratos", {
      method: contratoId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/contratos/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="empresaId" required>Cliente</Label>
          <select
            id="empresaId"
            value={form.empresaId}
            onChange={(e) => setForm((f) => ({ ...f, empresaId: e.target.value }))}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          >
            {empresas.map((x) => (
              <option key={x.id} value={x.id}>{x.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            value={form.numero}
            onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Input
            id="descricao"
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="dataAssinatura">Data de assinatura</Label>
          <Input
            id="dataAssinatura"
            type="date"
            value={form.dataAssinatura}
            onChange={(e) => setForm((f) => ({ ...f, dataAssinatura: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="dataValidade">Validade</Label>
          <Input
            id="dataValidade"
            type="date"
            value={form.dataValidade}
            onChange={(e) => setForm((f) => ({ ...f, dataValidade: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            rows={3}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : contratoId ? "Salvar alterações" : "Criar contrato"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
