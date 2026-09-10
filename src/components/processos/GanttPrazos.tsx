"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button, Select } from "@/components/ui";

type Barra = { id: number; titulo: string; iniMs: number; fimMs: number; natureza: string; status: string; cliente: string; empreendimento: string };
type Escala = "semana" | "mes" | "trimestre" | "ano";
type Unidade = { label: string; start: number; end: number };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const UM_DIA = 86400000;

function inicioDia(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function inicioSemana(d: Date) { const x = inicioDia(d); x.setDate(x.getDate() - x.getDay()); return x; }
function fimDia(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function fimSemana(d: Date) { return fimDia(new Date(inicioSemana(d).getTime() + 6 * UM_DIA)); }
function fimMes(ano: number, mes: number) { return fimDia(new Date(ano, mes + 1, 0)); }
function max(a: number, b: number) { return a > b ? a : b; }

const COR = (natureza: string, status: string) => {
  if (status === "concluido" || status === "concluida") return "#16a34a";
  if (status === "vencido") return "#dc2626";
  if (natureza === "ambiental") return "#f59e0b";
  return "#0ea5e9";
};

export function GanttPrazos({ barras }: { barras: Barra[] }) {
  const hoje = inicioDia(new Date());
  const [cursor, setCursor] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [escala, setEscala] = useState<Escala>("mes");
  const arraste = useRef<{ x: number; cursor: Date } | null>(null);
  const anoAtual = hoje.getFullYear();
  const anos = Array.from({ length: 11 }, (_, i) => anoAtual - 5 + i);

  const intervalo = useMemo(() => {
    if (escala === "semana") return { start: inicioSemana(cursor), end: fimSemana(cursor) };
    if (escala === "trimestre") {
      const primeiroMes = Math.floor(cursor.getMonth() / 3) * 3;
      return { start: new Date(cursor.getFullYear(), primeiroMes, 1), end: fimMes(cursor.getFullYear(), primeiroMes + 2) };
    }
    if (escala === "ano") return { start: new Date(cursor.getFullYear(), 0, 1), end: fimMes(cursor.getFullYear(), 11) };
    return { start: inicioSemana(new Date(cursor.getFullYear(), cursor.getMonth(), 1)), end: fimSemana(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) };
  }, [cursor, escala]);
  const rangeStart = intervalo.start.getTime();
  const rangeEnd = intervalo.end.getTime();
  const rangeTotal = rangeEnd - rangeStart;

  const unidades = useMemo<Unidade[]>(() => {
    const output: Unidade[] = [];
    if (escala === "semana") {
      for (let i = 0; i < 7; i++) { const d = new Date(rangeStart + i * UM_DIA); output.push({ label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), start: d.getTime(), end: fimDia(d).getTime() }); }
    } else if (escala === "mes") {
      for (let start = rangeStart; start <= rangeEnd; start += 7 * UM_DIA) { const end = Math.min(start + 7 * UM_DIA - 1, rangeEnd); output.push({ label: `Sem. ${output.length + 1}`, start, end }); }
    } else {
      const months = escala === "ano" ? 12 : 3;
      const firstMonth = escala === "ano" ? 0 : Math.floor(cursor.getMonth() / 3) * 3;
      for (let i = 0; i < months; i++) { const month = firstMonth + i; const start = new Date(cursor.getFullYear(), month, 1).getTime(); const end = fimMes(cursor.getFullYear(), month).getTime(); output.push({ label: MESES[month], start, end }); }
    }
    return output;
  }, [cursor, escala, rangeStart, rangeEnd]);

  const grupos = useMemo(() => {
    const map = new Map<string, Map<string, Barra[]>>();
    for (const barra of barras) { if (!map.has(barra.cliente)) map.set(barra.cliente, new Map()); const empresas = map.get(barra.cliente)!; if (!empresas.has(barra.empreendimento)) empresas.set(barra.empreendimento, []); empresas.get(barra.empreendimento)!.push(barra); }
    return [...map.entries()].map(([cliente, empresas]) => ({ cliente, empresas: [...empresas.entries()].map(([nome, itens]) => ({ nome, itens })) }));
  }, [barras]);

  const rows = useMemo(() => grupos.flatMap((grupo) => {
    const visiveis = grupo.empresas.map((empresa) => ({ nome: empresa.nome, itens: empresa.itens.filter((barra) => barra.fimMs >= rangeStart && barra.iniMs <= rangeEnd) })).filter((empresa) => empresa.itens.length > 0);
    return visiveis.length ? [{ tipo: "grupo" as const, label: grupo.cliente, itens: visiveis.flatMap((empresa) => empresa.itens), }, ...visiveis.map((empresa) => ({ tipo: "emp" as const, label: empresa.nome, itens: empresa.itens }))] : [];
  }), [grupos, rangeStart, rangeEnd]);

  const titulo = escala === "semana"
    ? `${intervalo.start.toLocaleDateString("pt-BR")} a ${intervalo.end.toLocaleDateString("pt-BR")}`
    : escala === "trimestre"
      ? `${Math.floor(cursor.getMonth() / 3) + 1}º trimestre de ${cursor.getFullYear()}`
      : escala === "ano" ? String(cursor.getFullYear()) : `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const pct = (ms: number) => Math.max(0, Math.min(1, (ms - rangeStart) / rangeTotal)) * 100;
  const navegar = (passos: number) => setCursor((atual) => { const d = new Date(atual); if (escala === "semana") d.setDate(d.getDate() + passos * 7); else if (escala === "ano") d.setFullYear(d.getFullYear() + passos); else if (escala === "trimestre") d.setMonth(d.getMonth() + passos * 3); else d.setMonth(d.getMonth() + passos); return d; });
  const zoom = (direction: number) => { const niveis: Escala[] = ["semana", "mes", "trimestre", "ano"]; const atual = niveis.indexOf(escala); setEscala(niveis[Math.max(0, Math.min(niveis.length - 1, atual + direction))]); };
  const iniciarArraste = (event: React.PointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture(event.pointerId); arraste.current = { x: event.clientX, cursor }; };
  const moverArraste = (event: React.PointerEvent<HTMLDivElement>) => { if (!arraste.current) return; const delta = event.clientX - arraste.current.x; const dias = (delta / event.currentTarget.clientWidth) * (rangeTotal / UM_DIA); setCursor(new Date(arraste.current.cursor.getTime() - dias * UM_DIA)); };
  const finalizarArraste = () => { arraste.current = null; };
  const usarRoda = (event: React.WheelEvent<HTMLDivElement>) => { if (Math.abs(event.deltaY) < 2) return; event.preventDefault(); zoom(event.deltaY > 0 ? 1 : -1); };

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => navegar(escala === "ano" ? -1 : escala === "trimestre" ? -4 : escala === "mes" ? -12 : -52)} title="Anterior" className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white hover:bg-navy-800"><ChevronsLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => navegar(-1)} title="Anterior" className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white hover:bg-navy-800"><ChevronLeft className="h-5 w-5" /></button>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setCursor(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}>Hoje</Button>
        <button type="button" onClick={() => navegar(1)} title="Próximo" className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white hover:bg-navy-800"><ChevronRight className="h-5 w-5" /></button>
        <button type="button" onClick={() => navegar(escala === "ano" ? 1 : escala === "trimestre" ? 4 : escala === "mes" ? 12 : 52)} title="Próximo" className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white hover:bg-navy-800"><ChevronsRight className="h-5 w-5" /></button>
        <Select value={cursor.getFullYear()} onChange={(e) => setCursor(new Date(Number(e.target.value), cursor.getMonth(), 1))} className="w-auto text-sm">{anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}</Select>
      </div>
      <div className="flex items-center gap-2"><span className="text-sm font-semibold text-navy-900">{titulo}</span><Select value={escala} onChange={(e) => setEscala(e.target.value as Escala)} className="w-auto text-sm"><option value="semana">Semana</option><option value="mes">Mês</option><option value="trimestre">Trimestre</option><option value="ano">Ano</option></Select></div>
    </div>
    <div className="flex">
      <div className="w-36 shrink-0 border-r border-slate-200 bg-slate-50 sm:w-56"><div className="h-[87px] border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Cliente / Empreendimento</div>{rows.map((row, index) => <div key={index} className={`flex h-9 items-center border-b px-3 text-xs ${row.tipo === "grupo" ? "border-slate-200 bg-slate-100 font-semibold text-navy-900" : "border-slate-100 font-medium text-slate-700"}`}><span className="truncate">{row.label}</span></div>)}{rows.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted">Sem dados no período.</div>}</div>
      <div className="relative min-w-0 flex-1 cursor-grab select-none overflow-hidden active:cursor-grabbing" onPointerDown={iniciarArraste} onPointerMove={moverArraste} onPointerUp={finalizarArraste} onPointerCancel={finalizarArraste} onWheel={usarRoda}><div className="w-full"><div className="flex h-[29px] items-center border-b border-slate-200 bg-slate-50 px-2 text-xs font-bold text-navy-900">Escala: {escala} · arraste para navegar · roda para zoom</div><div className="flex h-[29px] border-b border-slate-200 bg-slate-50">{unidades.map((unidade) => <div key={unidade.start} className="min-w-0 flex-1 border-r border-slate-200 px-1 py-1 text-center text-[10px] font-semibold uppercase text-muted">{unidade.label}</div>)}</div><div className="flex h-[29px] border-b border-slate-200 bg-slate-50">{unidades.map((unidade) => <div key={unidade.end} className="min-w-0 flex-1 border-r border-slate-100 px-1 py-1 text-center text-[10px] text-muted">{new Date(unidade.start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>)}</div>{rows.map((row, index) => <div key={`row-${index}`} className="relative h-9 border-b border-slate-100">{row.tipo === "emp" && <div className="absolute bottom-0 top-0 w-px bg-navy-500/40" style={{ left: `${pct(hoje.getTime())}%` }} />}{row.tipo === "emp" && row.itens.map((barra) => <div key={barra.id} className="absolute top-[3px] z-10 flex h-[30px] items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white" style={{ left: `${pct(barra.iniMs)}%`, width: `${Math.max(pct(barra.fimMs) - pct(barra.iniMs), 2)}%`, backgroundColor: COR(barra.natureza, barra.status) }} title={`${barra.cliente} · ${barra.empreendimento}\n${barra.titulo}`}><span className="truncate whitespace-nowrap">{barra.titulo}</span></div>)}</div>)}</div></div>
    </div>
  </div>;
}
