"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { Plus } from "lucide-react";

const TIPOS = ["Taxa", "Serviço", "Fornecedor", "Honorário", "Tarifa", "Outro"];
const STATUS = ["pendente", "pago"];

export function NovoCustoForm({
  processos,
}: {
  processos: { id: number; numero: string; orgao: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    tipo: "Outro",
    data: "",
    fornecedor: "",
    status: "pendente",
    processoId: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/custos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valor: Number(form.valor),
        processoId: form.processoId ? Number(form.processoId) : null,
        data: form.data || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao registrar custo.");
      return;
    }
    setForm({ descricao: "", valor: "", tipo: "Outro", data: "", fornecedor: "", status: "pendente", processoId: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)}>
        <Plus className="h-4 w-4" /> {open ? "Cancelar" : "Novo custo"}
      </Button>

      {open && (
        <Card className="mt-4">
          <CardHeader title="Registrar custo" />
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="desc" required>Descrição</Label>
              <Input id="desc" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="valor" required>Valor (R$)</Label>
              <Input id="valor" type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select id="tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input id="fornecedor" value={form.fornecedor} onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="processoId">Vincular a processo (opcional)</Label>
              <Select id="processoId" value={form.processoId} onChange={(e) => setForm((f) => ({ ...f, processoId: e.target.value }))}>
                <option value="">— sem vínculo —</option>
                {processos.map((p) => (
                  <option key={p.id} value={p.id}>{p.numero} ({p.orgao})</option>
                ))}
              </Select>
            </div>
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Registrar"}</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
