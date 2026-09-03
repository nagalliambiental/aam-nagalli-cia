"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Select } from "@/components/ui";

type Barra = {
  id: number;
  titulo: string;
  iniMs: number;
  fimMs: number;
  natureza: string;
  status: string;
  cliente: string;
  empreendimento: string;
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const UM_DIA = 86400000;

function inicioSemana(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function fimSemana(d: Date) { const x = inicioSemana(d); return new Date(x.getTime() + 6 * UM_DIA + (UM_DIA - 1)); }
function min(a: number, b: number) { return a < b ? a : b; }
function max(a: number, b: number) { return a > b ? a : b; }

const COR = (natureza: string, status: string) => {
  if (status === "concluido" || status === "concluida") return "#16a34a";
  if (status === "vencido") return "#dc2626";
  if (natureza === "ambiental") return "#f59e0b";
  return "#0ea5e9";
};

export function GanttPrazos({ barras }: { barras: Barra[] }) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const anoAtual = hoje.getFullYear();
  const anos = Array.from({ length: 11 }, (_, i) => anoAtual - 5 + i);

  // Agrupa por cliente -> empreendimento
  const grupos = useMemo(() => {
    const m = new Map<string, Map<string, Barra[]>>();
    for (const b of barras) {
      if (!m.has(b.cliente)) m.set(b.cliente, new Map());
      const emps = m.get(b.cliente)!;
      if (!emps.has(b.empreendimento)) emps.set(b.empreendimento, []);
      emps.get(b.empreendimento)!.push(b);
    }
    return [...m.entries()].map(([cliente, emps]) => ({
      cliente,
      emps: [...emps.entries()].map(([nome, itens]) => ({ nome, itens })),
    }));
  }, [barras]);

  const rows = useMemo(() => {
    const out: { tipo: "grupo" | "emp"; label: string; itens: Barra[] }[] = [];
    for (const g of grupos) {
      out.push({ tipo: "grupo", label: g.cliente, itens: g.emps.flatMap((e) => e.itens) });
      for (const e of g.emps) out.push({ tipo: "emp", label: e.nome, itens: e.itens });
    }
    return out;
  }, [grupos]);

  // Range: em torno do mês selecionado (início da 1ª semana do mês até o fim da última)
  const rangeStart = inicioSemana(new Date(month.getFullYear(), month.getMonth(), 1)).getTime();
  const rangeEnd = fimSemana(new Date(month.getFullYear(), month.getMonth() + 1, 0)).getTime();
  const rangeTotal = rangeEnd - rangeStart;

  const days: Date[] = [];
  for (let t = rangeStart; t <= rangeEnd; t += UM_DIA) days.push(new Date(t));

  const semanas = useMemo(() => {
    const out: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  const navMes = (d: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + d, 1));

  const numDia = rangeTotal / UM_DIA;
  const pct = (ms: number) => Math.max(0, Math.min(1, (ms - rangeStart) / rangeTotal)) * 100;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-1">
          <Select value={month.getMonth()} onChange={(e) => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))} className="w-auto text-sm">
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </Select>
          <Select value={month.getFullYear()} onChange={(e) => setMonth(new Date(Number(e.target.value), month.getMonth(), 1))} className="w-auto text-sm">
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setMonth(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}>Hoje</Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => navMes(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => navMes(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex">
        {/* Coluna esquerda (congelada) */}
        <div className="w-56 shrink-0 border-r border-slate-200 bg-slate-50">
          <div className="h-[52px] border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Cliente / Empreendimento</div>
          {rows.map((r, i) => (
            <div key={i} className={`flex h-9 items-center px-3 text-xs ${r.tipo === "grupo" ? "border-b border-slate-200 bg-slate-100 font-semibold text-navy-900" : "border-b border-slate-100 font-medium text-slate-700"}`}>
              <span className="truncate">{r.label}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted">Sem dados no mês.</div>}
        </div>

        {/* Timeline */}
        <div className="relative min-w-0 flex-1 overflow-x-auto">
          <div style={{ minWidth: `${days.length * 26}px` }}>
            {/* Mês */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-navy-900">
              {MESES[month.getMonth()]} {month.getFullYear()}
            </div>
            {/* Semanas */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              {semanas.map((wk, i) => (
                <div key={i} className="border-r border-slate-200 px-2 py-1 text-center text-[10px] font-semibold uppercase text-muted" style={{ width: `${wk.length * 26}px` }}>
                  Semana {i + 1}                </div>
              ))}
            </div>
            {/* Dias */}
            <div className="flex border-b border-slate-200">
              {days.map((d) => {
                const isHoje = d.toDateString() === hoje.toDateString();
                return (
                  <div key={d.getTime()} className="flex items-center justify-center border-r border-slate-100 py-1 text-[10px]" style={{ width: 26 }}>
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${isHoje ? "bg-navy-700 text-white font-bold" : "text-muted"}`}>{d.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Linhas de barras */}
            {rows.map((r, i) => (
              <div key={`r${i}`} className="relative border-b border-slate-100" style={{ height: 36 }}>
                {r.tipo !== "grupo" && (
                  <div className="absolute bottom-0 top-0 w-px bg-navy-500/40" style={{ left: `${pct(hoje.getTime())}%` }} />
                )}
                {r.itens.map((b) => (
                  <div
                    key={b.id}
                    className="absolute top-[3px] z-10 flex h-[30px] items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white"
                    style={{ left: `${pct(b.iniMs)}%`, width: `${max(pct(b.fimMs) - pct(b.iniMs), 2)}%`, backgroundColor: COR(b.natureza, b.status) }}
                    title={`${b.cliente} · ${b.empreendimento}\n${b.titulo}`}
                  >
                    <span className="truncate whitespace-nowrap">{b.titulo}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
