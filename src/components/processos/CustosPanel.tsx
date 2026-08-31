"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";

type CustoItem = {
  id: number;
  tipo: string;
  descricao: string;
  valor: { toNumber: () => number };
  data: Date;
  fornecedor: string | null;
  status: string;
  responsavel: { nome: string } | null;
};

export function CustosPanel({
  processoId,
  custos,
}: {
  processoId: number;
  custos: CustoItem[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: "taxa",
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    fornecedor: "",
    status: "pendente",
    observacoes: "",
  });

  const total = custos.reduce((acc, c) => acc + c.valor.toNumber(), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/processos/${processoId}/custos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valor: Number(form.valor),
        data: form.data ? new Date(form.data) : null,
        fornecedor: form.fornecedor || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao adicionar custo.");
      return;
    }
    setForm((f) => ({ ...f, descricao: "", valor: "", fornecedor: "" }));
    setShow(false);
    router.refresh();
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const input =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20";

  return (
    <Card>
      <CardHeader
        title="Custos"
        actions={
          <Button variant="secondary" onClick={() => setShow((s) => !s)}>
            {show ? "Cancelar" : "+ Custo"}
          </Button>
        }
      />

      {show && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-b border-slate-200 p-5 md:grid-cols-3">
          <div>
            <Label htmlFor="descricao" required>Descrição</Label>
            <Input id="descricao" value={form.descricao} onChange={set("descricao")} required />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select id="tipo" value={form.tipo} onChange={set("tipo")}>
              <option value="taxa">Taxas</option>
              <option value="consultoria">Consultoria</option>
              <option value="estudo">Estudos</option>
              <option value="vistoria">Vistorias</option>
              <option value="analise">Análises</option>
              <option value="deslocamento">Deslocamento</option>
              <option value="protocolo">Protocolos</option>
              <option value="outro">Outros</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="valor" required>Valor (R$)</Label>
            <Input id="valor" type="number" step="0.01" value={form.valor} onChange={set("valor")} required />
          </div>
          <div>
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={form.data} onChange={set("data")} />
          </div>
          <div>
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Input id="fornecedor" value={form.fornecedor} onChange={set("fornecedor")} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={set("status")}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" value={form.observacoes} onChange={set("observacoes")} rows={2} />
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar custo"}
            </Button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-sm text-muted">Total</span>
        <span className="text-lg font-bold text-navy-900">
          R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <ul className="divide-y divide-slate-100">
        {custos.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-navy-900">{c.descricao}</p>
              <p className="text-xs text-muted">
                {c.tipo}
                {c.fornecedor ? ` · ${c.fornecedor}` : ""}
                {c.data ? ` · ${formatDate(c.data)}` : ""}
                {c.responsavel ? ` · ${c.responsavel.nome}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-semibold">
                R$ {c.valor.toNumber().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                c.status === "pago" ? "bg-green-100 text-green-700"
                : c.status === "cancelado" ? "bg-slate-100 text-slate-600"
                : "bg-amber-100 text-amber-700"
              }`}>
                {c.status}
              </span>
            </div>
          </li>
        ))}
        {custos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhum custo registrado.
          </li>
        )}
      </ul>
    </Card>
  );
}
