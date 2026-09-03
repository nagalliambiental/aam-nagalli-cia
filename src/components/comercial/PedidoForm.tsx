"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";

type Empresa = { id: number; nome: string };
type Servico = { id: number; nome: string; valorUnitario: number; unidade: string };

type Item = { servicoId: number | null; descricao: string; unidade: string; quantidade: string; valorUnitario: string };

const UNIDADES = ["und", "horas", "diária", "m²", "km", "kg", "ton"];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function PedidoForm({
  empresas,
  servicos,
}: {
  empresas: Empresa[];
  servicos: Servico[];
}) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState("");
  const [itens, setItens] = useState<Item[]>([{ servicoId: null, descricao: "", unidade: "und", quantidade: "", valorUnitario: "" }]);
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor" | "">("");
  const [descontoValor, setDescontoValor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setItem(index: number, patch: Partial<Item>) {
    setItens((arr) => arr.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addLinha() {
    setItens((arr) => [...arr, { servicoId: null, descricao: "", unidade: "und", quantidade: "", valorUnitario: "" }]);
  }

  function removeLinha(i: number) {
    setItens((arr) => arr.filter((_, x) => x !== i));
  }

  function onServico(i: number, id: string) {
    const s = servicos.find((x) => x.id === Number(id));
    if (s) {
      setItem(i, { servicoId: s.id, descricao: s.nome, valorUnitario: String(s.valorUnitario), unidade: s.unidade });
    } else {
      setItem(i, { servicoId: null, descricao: "", valorUnitario: "", unidade: "und" });
    }
  }

  const subtotal = useMemo(() => {
    return round2(itens.reduce((s, it) => s + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0));
  }, [itens]);

  const desconto = useMemo(() => {
    if (!descontoTipo) return 0;
    const dv = Number(descontoValor) || 0;
    if (descontoTipo === "percentual") return round2(subtotal * (Math.min(100, dv) / 100));
    return Math.min(dv, subtotal);
  }, [descontoTipo, descontoValor, subtotal]);

  const total = round2(subtotal - desconto);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId: Number(empresaId),
        descontoTipo: descontoTipo || null,
        descontoValor: descontoTipo ? Number(descontoValor) : null,
        observacoes,
        itens: itens.map((it) => ({ servicoId: it.servicoId, descricao: it.descricao, unidade: it.unidade, quantidade: Number(it.quantidade) || 0, valorUnitario: Number(it.valorUnitario) || 0 })),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "Erro ao salvar pedido."); return; }
    router.push(`/pedidos/${d.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="empresaId" required>Cliente</Label>
          <Select id="empresaId" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} required>
            <option value="">— selecione —</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="dataPedido" required>Data</Label>
          <Input id="dataPedido" type="date" value={new Date().toISOString().slice(0, 10)} readOnly />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Itens</Label>
          <Button type="button" variant="secondary" onClick={addLinha} className="px-3 py-1.5 text-xs">
            <Plus className="h-4 w-4" /> Adicionar item
          </Button>
        </div>

        <div className="space-y-2">
          {itens.map((it, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="col-span-6">
                <Label htmlFor={`sv-${i}`}>Serviço</Label>
                <Select id={`sv-${i}`} value={it.servicoId ?? ""} onChange={(e) => onServico(i, e.target.value)}>
                  <option value="">— serviço (ou digite) —</option>
                  {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </Select>
              </div>
              <div className="col-span-6">
                <Label htmlFor={`ds-${i}`}>Descrição</Label>
                <Input id={`ds-${i}`} value={it.descricao} onChange={(e) => setItem(i, { descricao: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label htmlFor={`un-${i}`}>Un</Label>
                <Input id={`un-${i}`} list="unidades" value={it.unidade} onChange={(e) => setItem(i, { unidade: e.target.value })} />
              </div>
              <div className="col-span-3">
                <Label htmlFor={`qd-${i}`}>Qtd</Label>
                <Input id={`qd-${i}`} type="number" step="0.01" min="0" value={it.quantidade} onChange={(e) => setItem(i, { quantidade: e.target.value })} />
              </div>
              <div className="col-span-3">
                <Label htmlFor={`vu-${i}`}>Valor unit.</Label>
                <Input id={`vu-${i}`} type="number" step="0.01" min="0" value={it.valorUnitario} onChange={(e) => setItem(i, { valorUnitario: e.target.value })} />
              </div>
              <div className="col-span-3 flex items-end gap-2">
                <span className="mb-1 w-full truncate text-sm font-semibold text-navy-900">
                  R$ {round2((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <button type="button" onClick={() => removeLinha(i)} className="mb-1 rounded p-1 text-slate-400 hover:text-red-600" title="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <datalist id="unidades">
          {UNIDADES.map((u) => <option key={u} value={u} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="dTipo">Desconto (opcional)</Label>
          <Select id="dTipo" value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value as "percentual" | "valor" | "")}>
            <option value="">— sem desconto —</option>
            <option value="percentual">Percentual (%)</option>
            <option value="valor">Valor (R$)</option>
          </Select>
        </div>
        {descontoTipo && (
          <div>
            <Label htmlFor="dValor">{descontoTipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}</Label>
            <Input id="dValor" type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} />
          </div>
        )}
      </div>

      <div className="rounded-md bg-slate-50 p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="font-semibold">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
        {descontoTipo && <div className="flex justify-between"><span className="text-muted">Desconto</span><span className="font-semibold text-red-600">- R$ {desconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>}
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base"><span className="font-medium">Total</span><span className="font-bold text-navy-900">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
      </div>

      <div>
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading || !empresaId}>{loading ? "Gerando..." : "Gerar pedido"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
