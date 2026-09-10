"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";

type Barra = { id: number; titulo: string; iniMs: number; fimMs: number; natureza: string; status: string; cliente: string; empreendimento: string };
type Escala = "mes" | "trimestre" | "semestre" | "ano";
type Unidade = { label: string; start: number; end: number };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const UM_DIA = 86400000;
const inicioDia = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const inicioSemana = (d: Date) => { const x = inicioDia(d); x.setDate(x.getDate() - x.getDay()); return x; };
const fimDia = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const fimSemana = (d: Date) => fimDia(new Date(inicioSemana(d).getTime() + 6 * UM_DIA));
const fimMes = (ano: number, mes: number) => fimDia(new Date(ano, mes + 1, 0));
const corBarra = (status: string) => status === "concluido" || status === "concluida" ? "#2f8ac1" : status === "em_andamento" || status === "ativo" ? "#24678f" : status === "para_revisao" ? "#b45309" : "#ff740d";

export function GanttPrazos({ barras }: { barras: Barra[] }) {
  const hoje = inicioDia(new Date());
  const [cursor, setCursor] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [escala, setEscala] = useState<Escala>("ano");
  const [hovered, setHovered] = useState<{ barra: Barra; x: number; y: number } | null>(null);
  const [selecionada, setSelecionada] = useState<Barra | null>(null);
  const arraste = useRef<{ x: number; cursor: Date } | null>(null);
  const anos = Array.from({ length: 11 }, (_, i) => hoje.getFullYear() - 5 + i);

  const intervalo = useMemo(() => {
    if (escala === "ano") return { start: new Date(cursor.getFullYear(), 0, 1), end: fimMes(cursor.getFullYear(), 11) };
    if (escala === "semestre") { const m = Math.floor(cursor.getMonth() / 6) * 6; return { start: new Date(cursor.getFullYear(), m, 1), end: fimMes(cursor.getFullYear(), m + 5) }; }
    if (escala === "trimestre") { const m = Math.floor(cursor.getMonth() / 3) * 3; return { start: new Date(cursor.getFullYear(), m, 1), end: fimMes(cursor.getFullYear(), m + 2) }; }
    return { start: inicioSemana(new Date(cursor.getFullYear(), cursor.getMonth(), 1)), end: fimSemana(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) };
  }, [cursor, escala]);
  const rangeStart = intervalo.start.getTime();
  const rangeEnd = intervalo.end.getTime();
  const rangeTotal = rangeEnd - rangeStart;
  const pct = (ms: number) => Math.max(0, Math.min(1, (ms - rangeStart) / rangeTotal)) * 100;

  const unidades = useMemo<Unidade[]>(() => {
    if (escala === "mes") { const result: Unidade[] = []; for (let t = rangeStart; t <= rangeEnd; t += UM_DIA) { const d = new Date(t); result.push({ label: d.toLocaleDateString("pt-BR", { day: "2-digit" }), start: t, end: fimDia(d).getTime() }); } return result; }
    const count = escala === "ano" ? 12 : escala === "semestre" ? 6 : 3;
    const firstMonth = escala === "ano" ? 0 : escala === "semestre" ? Math.floor(cursor.getMonth() / 6) * 6 : Math.floor(cursor.getMonth() / 3) * 3;
    return Array.from({ length: count }, (_, i) => { const month = firstMonth + i; return { label: MESES[month], start: new Date(cursor.getFullYear(), month, 1).getTime(), end: fimMes(cursor.getFullYear(), month).getTime() }; });
  }, [cursor, escala, rangeStart, rangeEnd]);

  const rows = useMemo(() => {
    const groups = new Map<string, Map<string, Barra[]>>();
    for (const barra of barras) { if (!groups.has(barra.cliente)) groups.set(barra.cliente, new Map()); const client = groups.get(barra.cliente)!; if (!client.has(barra.empreendimento)) client.set(barra.empreendimento, []); client.get(barra.empreendimento)!.push(barra); }
    return [...groups.entries()].flatMap(([cliente, emps]) => { const visible = [...emps.entries()].map(([label, items]) => ({ label, items: items.filter((b) => b.fimMs >= rangeStart && b.iniMs <= rangeEnd) })).filter((e) => e.items.length); return visible.length ? [{ tipo: "grupo" as const, label: cliente, itens: visible.flatMap((e) => e.items) }, ...visible.map((e) => ({ tipo: "emp" as const, label: e.label, itens: e.items }))] : []; });
  }, [barras, rangeStart, rangeEnd]);

  const navegar = (amount: number) => setCursor((current) => { const next = new Date(current); next.setMonth(next.getMonth() + amount); return next; });
  const step = escala === "ano" ? 12 : escala === "semestre" ? 6 : escala === "trimestre" ? 3 : 1;
  const zoom = (direction: number) => { const levels: Escala[] = ["mes", "trimestre", "semestre", "ano"]; setEscala(levels[Math.max(0, Math.min(3, levels.indexOf(escala) + direction))]); };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); arraste.current = { x: e.clientX, cursor }; };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (!arraste.current) return; const days = ((e.clientX - arraste.current.x) / e.currentTarget.clientWidth) * (rangeTotal / UM_DIA); setCursor(new Date(arraste.current.cursor.getTime() - days * UM_DIA)); };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => { e.preventDefault(); if (Math.abs(e.deltaY) > 2) zoom(e.deltaY > 0 ? 1 : -1); };
  const titulo = escala === "ano" ? String(cursor.getFullYear()) : escala === "semestre" ? `${Math.floor(cursor.getMonth() / 6) + 1}º semestre de ${cursor.getFullYear()}` : escala === "trimestre" ? `${Math.floor(cursor.getMonth() / 3) + 1}º trimestre de ${cursor.getFullYear()}` : `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-1"><button onClick={() => navegar(-step * 4)} className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white"><ChevronsLeft className="h-5 w-5" /></button><button onClick={() => navegar(-step)} className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white"><ChevronLeft className="h-5 w-5" /></button><Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setCursor(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}>Hoje</Button><button onClick={() => navegar(step)} className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white"><ChevronRight className="h-5 w-5" /></button><button onClick={() => navegar(step * 4)} className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-white"><ChevronsRight className="h-5 w-5" /></button><Select value={cursor.getFullYear()} onChange={(e) => setCursor(new Date(Number(e.target.value), cursor.getMonth(), 1))} className="w-auto text-sm">{anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}</Select></div>
      <div className="flex items-center gap-2"><span className="text-sm font-semibold text-navy-900">{titulo}</span><Select value={escala} onChange={(e) => setEscala(e.target.value as Escala)} className="w-auto text-sm"><option value="mes">Mensal</option><option value="trimestre">Trimestral</option><option value="semestre">Semestral</option><option value="ano">Anual</option></Select></div>
    </div>
    <div className="flex"><div className="w-36 shrink-0 border-r border-slate-200 bg-slate-50 sm:w-56"><div className="h-[87px] border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Cliente / Empreendimento</div>{rows.map((row, i) => <div key={i} className={`flex h-9 items-center border-b px-3 text-xs ${row.tipo === "grupo" ? "bg-[#d8eaf7] font-semibold text-navy-900" : "font-medium text-slate-700"}`}><span className="truncate">{row.label}</span></div>)}</div>
      <div className="relative min-w-0 flex-1 cursor-grab select-none overflow-hidden active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { arraste.current = null; }} onPointerCancel={() => { arraste.current = null; }} onWheel={onWheel}><div className="w-full"><div className="flex h-[29px] items-center border-b border-slate-200 bg-slate-50 px-2 text-xs font-bold text-navy-900">Escala: {escala} · arraste para navegar · roda para zoom</div><div className="flex h-[29px]">{unidades.map((u, i) => <div key={u.start} className={`min-w-0 flex-1 border-r border-white/50 px-1 py-1 text-center text-[10px] font-semibold uppercase ${i % 2 === 0 ? "bg-[#2d83b7] text-white" : "bg-[#ffa05a] text-slate-900"}`}>{u.label}</div>)}</div><div className="flex h-[29px] border-b border-slate-200 bg-slate-50">{unidades.map((u) => <div key={u.end} className="min-w-0 flex-1 border-r border-slate-100 text-center text-[10px] text-muted">{new Date(u.start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>)}</div>{rows.map((row, i) => <div key={i} className={`relative h-9 border-b border-slate-100 ${row.tipo === "grupo" ? "bg-[#d8eaf7]" : ""}`}>{row.tipo === "emp" && row.itens.map((barra) => <div key={barra.id} className="absolute top-[3px] z-10 flex h-[30px] cursor-pointer items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white" style={{ left: `${Math.max(0, Math.min(100, (barra.iniMs - rangeStart) / rangeTotal * 100))}%`, width: `${Math.max(((Math.min(barra.fimMs, rangeEnd) - Math.max(barra.iniMs, rangeStart)) / rangeTotal) * 100, 2)}%`, backgroundColor: corBarra(barra.status) }} onMouseEnter={(e) => setHovered({ barra, x: e.clientX, y: e.clientY })} onMouseMove={(e) => setHovered((h) => h ? { ...h, x: e.clientX, y: e.clientY } : h)} onMouseLeave={() => setHovered(null)} onClick={(e) => { e.stopPropagation(); setSelecionada(barra); setHovered(null); }}><span className="truncate whitespace-nowrap">{barra.titulo}</span></div>)}</div>)}</div></div></div>
    {hovered && <div className="pointer-events-none fixed z-[90] w-72 -translate-y-full rounded-lg bg-navy-950 p-3 text-xs text-white shadow-xl" style={{ left: Math.min(hovered.x + 12, window.innerWidth - 310), top: Math.max(hovered.y - 12, 12) }}><p className="font-semibold">{hovered.barra.titulo}</p><p className="mt-1 text-white/75">{hovered.barra.cliente} · {hovered.barra.empreendimento}</p><p className="mt-1 text-white/75">{formatDate(new Date(hovered.barra.iniMs))} até {formatDate(new Date(hovered.barra.fimMs))}</p><p className="mt-1 text-white/75">Status: {hovered.barra.status}</p></div>}
    {selecionada && <div className="fixed inset-0 z-[80] bg-slate-900/30" onClick={() => setSelecionada(null)}><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Detalhes da tarefa</p><h2 className="mt-1 text-lg font-semibold text-navy-900">{selecionada.titulo}</h2></div><button onClick={() => setSelecionada(null)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5 text-sm"><div><p className="text-xs text-muted">Cliente</p><p className="font-medium">{selecionada.cliente}</p></div><div><p className="text-xs text-muted">Empreendimento</p><p className="font-medium">{selecionada.empreendimento}</p></div><div><p className="text-xs text-muted">Período</p><p className="font-medium">{formatDate(new Date(selecionada.iniMs))} até {formatDate(new Date(selecionada.fimMs))}</p></div><div><p className="text-xs text-muted">Status</p><p className="font-medium">{selecionada.status}</p></div><div><p className="text-xs text-muted">Natureza</p><p className="font-medium">{selecionada.natureza === "ambiental" ? "Ambiental" : "Minerário"}</p></div></div></aside></div>}
  </div>;
}
