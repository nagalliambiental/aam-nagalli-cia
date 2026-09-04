"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { parseNumberBR } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

type Empresa = { id: number; nome: string; cnpj: string | null };
type Empreendimento = { id: number; nome: string; empresaId: number };

type Linha = {
  data: string;
  identificacao: string;
  descricao: string;
  qtde: string;
  horaTecnica: string;
  descontoPct: string;
  outrosCustos: string;
};

const linhaVazia = (): Linha => ({ data: "", identificacao: "", descricao: "", qtde: "", horaTecnica: "", descontoPct: "", outrosCustos: "" });

function round2(n: number) { return Math.round(n * 100) / 100; }

function calc(l: Linha) {
  const qtde = parseNumberBR(l.qtde);
  const hora = parseNumberBR(l.horaTecnica);
  const pct = parseNumberBR(l.descontoPct);
  const outros = parseNumberBR(l.outrosCustos);
  const base = qtde * hora;
  const desc = round2(base * (Math.min(100, pct) / 100));
  const adm = round2((base - desc + outros) * 0.18);
  const tot = round2((base - desc + outros) * 1.18);
  return { desc, adm, tot };
}

export function FaturaForm({
  empresas,
  empreendimentos,
}: {
  empresas: Empresa[];
  empreendimentos: Empreendimento[];
}) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState("");
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [referencia, setReferencia] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia()]);
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empsFiltrados = empresaId
    ? empreendimentos.filter((e) => e.empresaId === Number(empresaId))
    : empreendimentos;

  function setLinha(i: number, patch: Partial<Linha>) {
    setLinhas((arr) => arr.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));
  }

  async function buscarTarefas() {
    if (!empreendimentoId || !periodoInicio || !periodoFim) {
      setError("Selecione o empreendimento e o período (início e fim) para buscar as tarefas.");
      return;
    }
    setBuscando(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ empreendimentoId, inicio: periodoInicio, fim: periodoFim });
      const res = await fetch(`/api/faturas/tarefas?${qs.toString()}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erro ao buscar tarefas.");
      const novas: Linha[] = (d || []).map((t: { titulo: string; descricao: string | null; dataCriacao: string; processoNumero: string | null; empreendimentoNome: string }) => ({
        ...linhaVazia(),
        data: t.dataCriacao.slice(0, 10),
        identificacao: `${t.titulo}${t.processoNumero ? ` · Processo #${t.processoNumero}` : ""}${t.empreendimentoNome ? ` · ${t.empreendimentoNome}` : ""}`,
        descricao: t.descricao ?? "",
      }));
      // Mantém linhas manuais já preenchidas e acrescenta as puxadas (sem duplicar vazias iniciais)
      setLinhas((arr) => {
        const base = arr.length === 1 && !arr[0].identificacao && !arr[0].descricao ? [] : arr;
        return [...base, ...novas];
      });
      if (novas.length === 0) setError("Nenhuma tarefa encontrada nesse empreendimento/período.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar tarefas.");
    } finally {
      setBuscando(false);
    }
  }

  const totalGeral = useMemo(() => round2(linhas.reduce((s, l) => s + calc(l).tot, 0)), [linhas]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/faturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId: Number(empresaId),
        empreendimentoId: empreendimentoId ? Number(empreendimentoId) : null,
        referencia,
        periodoInicio: periodoInicio || null,
        periodoFim: periodoFim || null,
        vencimento: vencimento || null,
        itens: linhas.map((l) => ({
          data: l.data || null,
          identificacao: l.identificacao,
          descricao: l.descricao,
          qtde: parseNumberBR(l.qtde),
          horaTecnica: parseNumberBR(l.horaTecnica),
          descontoPct: parseNumberBR(l.descontoPct),
          outrosCustos: parseNumberBR(l.outrosCustos),
        })),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "Erro ao gerar fatura."); return; }
    router.push(`/faturas/${d.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="cliente" required>Cliente</Label>
          <Select id="cliente" value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setEmpreendimentoId(""); }} required>
            <option value="">— selecione —</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="empreendimento">Empreendimento</Label>
          <Select id="empreendimento" value={empreendimentoId} onChange={(e) => setEmpreendimentoId(e.target.value)}>
            <option value="">— selecione —</option>
            {empsFiltrados.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="referencia">Referência</Label>
          <Input id="referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ex.: Terra Roxa" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <div>
            <Label htmlFor="pini">Período de</Label>
            <Input id="pini" type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pfim">Período até</Label>
            <Input id="pfim" type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="venc">Vencimento</Label>
            <Input id="venc" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={buscarTarefas} disabled={buscando || !empreendimentoId}>
              {buscando ? "Buscando..." : "Buscar tarefas do período"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Itens (puxados das tarefas — complete os valores manualmente)</Label>
        <Button type="button" variant="secondary" onClick={() => setLinhas((arr) => [...arr, linhaVazia()])} className="px-3 py-1.5 text-xs">
          <Plus className="h-4 w-4" /> Adicionar item
        </Button>
      </div>

      <div className="space-y-3">
        {linhas.map((l, i) => {
          const c = calc(l);
          return (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <Label htmlFor={`d-${i}`}>Data</Label>
                  <Input id={`d-${i}`} type="date" value={l.data} onChange={(e) => setLinha(i, { data: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`idn-${i}`}>Identificação</Label>
                  <Input id={`idn-${i}`} value={l.identificacao} onChange={(e) => setLinha(i, { identificacao: e.target.value })} placeholder="Título da tarefa + nº processo + empreendimento" />
                </div>
              </div>
              <div>
                <Label htmlFor={`ds-${i}`}>Descrição</Label>
                <Textarea id={`ds-${i}`} value={l.descricao} onChange={(e) => setLinha(i, { descricao: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <Label htmlFor={`q-${i}`}>Qtde</Label>
                  <Input id={`q-${i}`} type="text" inputMode="decimal" placeholder="0,00" value={l.qtde} onChange={(e) => setLinha(i, { qtde: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`h-${i}`}>Hora técnica (R$)</Label>
                  <Input id={`h-${i}`} type="text" inputMode="decimal" placeholder="0,00" value={l.horaTecnica} onChange={(e) => setLinha(i, { horaTecnica: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`p-${i}`}>Desconto (%)</Label>
                  <Input id={`p-${i}`} type="text" inputMode="decimal" placeholder="0,00" value={l.descontoPct} onChange={(e) => setLinha(i, { descontoPct: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`o-${i}`}>Outros custos (R$)</Label>
                  <Input id={`o-${i}`} type="text" inputMode="decimal" placeholder="0,00" value={l.outrosCustos} onChange={(e) => setLinha(i, { outrosCustos: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                <span>Desconto: <b>R$ {c.desc.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></span>
                <span>Adm/Fiscais (18%): <b>R$ {c.adm.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></span>
                <span>Total: <b className="text-navy-900">R$ {c.tot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></span>
                <button type="button" onClick={() => setLinhas((arr) => arr.filter((_, x) => x !== i))} className="ml-auto rounded p-1 text-slate-400 hover:text-red-600" title="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-md bg-slate-50 p-4 text-right text-lg font-bold text-navy-900">
        Total geral: R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading || !empresaId}>{loading ? "Gerando..." : "Gerar fatura"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
