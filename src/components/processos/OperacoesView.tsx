"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Badge, Button, Select } from "@/components/ui";

type Prazo = { id: number; descricao: string; status: string; dataInicial: string; dataCalculadaAtual: string | null; alertaDias: number | null; processoNumero: string | null };
type Tarefa = { id: number; titulo: string; status: string; prazoData: string | null; responsavelNome: string | null };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function OperacoesView({ prazos, tarefas }: { prazos: Prazo[]; tarefas: Tarefa[] }) {
  const [aba, setAba] = useState<"prazos" | "calendario" | "alertas">("calendario");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const anoAtual = hoje.getFullYear();
  const anos = Array.from({ length: 11 }, (_, i) => anoAtual - 5 + i);

  const itensPorDia = useMemo(() => {
    const map = new Map<string, { tipo: "prazo" | "tarefa"; titulo: string; status: string }[]>();
    for (const p of prazos) {
      if (!p.dataCalculadaAtual) continue;
      const d = new Date(p.dataCalculadaAtual).toDateString();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push({ tipo: "prazo", titulo: p.descricao, status: p.status });
    }
    for (const t of tarefas) {
      if (!t.prazoData) continue;
      const d = new Date(t.prazoData).toDateString();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push({ tipo: "tarefa", titulo: t.titulo, status: t.status });
    }
    return map;
  }, [prazos, tarefas]);

  const inicioMes = new Date(month.getFullYear(), month.getMonth(), 1);
  const fimMes = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const diasMes = fimMes.getDate();

  const grid = useMemo(() => {
    const primeiroDiaSemana = inicioMes.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < primeiroDiaSemana; i++) cells.push(null);
    for (let d = 1; d <= diasMes; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const meses = useMemo(() => {
    // barra (gantt) posicionada dentro do mês
    const ini = inicioMes.getTime(), fim = fimMes.getTime();
    const itens = [
      ...prazos.map((p) => ({
        chave: `P${p.id}`,
        titulo: `${p.descricao}${p.processoNumero ? ` · ${p.processoNumero}` : ""}`,
        tipo: "prazo" as const,
        status: p.status,
        inicio: p.dataInicial ? new Date(p.dataInicial).getTime() : ini,
        fim: p.dataCalculadaAtual ? new Date(p.dataCalculadaAtual).getTime() : ini,
      })),
      ...tarefas.map((t) => ({
        chave: `T${t.id}`,
        titulo: t.titulo,
        tipo: "tarefa" as const,
        status: t.status,
        inicio: t.prazoData ? new Date(t.prazoData).getTime() : ini,
        fim: t.prazoData ? new Date(t.prazoData).getTime() + 86400000 : ini,
      })),
    ];
    return itens
      .filter((i) => i.fim >= ini && i.inicio <= fim)
      .map((i) => {
        const startRaw = Math.max(i.inicio, ini);
        const endRaw = Math.min(i.fim, fim);
        const left = ((startRaw - ini) / (fim - ini)) * 100;
        const width = Math.max(((endRaw - startRaw) / (fim - ini)) * 100, 2);
        return { ...i, left, width };
      })
      .sort((a, b) => a.left - b.left);
  }, [prazos, tarefas, month]);

  const vencidos = prazos.filter((p) => p.dataCalculadaAtual && new Date(p.dataCalculadaAtual) < hoje);
  const dentroAlerta = prazos.filter((p) => {
    if (!p.dataCalculadaAtual) return false;
    const dias = p.alertaDias ?? 30;
    const alvo = new Date(p.dataCalculadaAtual).getTime() - dias * 86400000;
    return alvo <= hoje.getTime();
  });

  const navMes = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {(["prazos", "calendario", "alertas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${aba === t ? "bg-navy-700 text-white" : "text-muted hover:bg-slate-100"}`}
          >
            {t === "prazos" ? "Prazos" : t === "calendario" ? "Calendário" : "Alertas"}
          </button>
        ))}
      </div>

      {aba === "prazos" && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {prazos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="font-medium text-navy-900">{p.descricao}</p>
                  <p className="text-xs text-muted">
                    {p.processoNumero ? `Processo ${p.processoNumero}` : "Sem processo"} · até {p.dataCalculadaAtual ? new Date(p.dataCalculadaAtual).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <Badge tone={p.status === "vencido" ? "red" : p.status === "vencendo" ? "amber" : "blue"}>{p.status}</Badge>
              </li>
            ))}
            {prazos.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Nenhum prazo em aberto.</li>}
          </ul>
        </Card>
      )}

      {aba === "calendario" && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-1">
              <Select value={month.getMonth()} onChange={(e) => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))}>
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </Select>
              <Select value={month.getFullYear()} onChange={(e) => setMonth(new Date(Number(e.target.value), month.getMonth(), 1))}>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
              <Button variant="secondary" onClick={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); }} className="text-xs px-3 py-1.5">
                Hoje
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => navMes(-1)} className="h-7 w-7 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" onClick={() => navMes(1)} className="h-7 w-7 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-muted">
            {DIAS.map((d) => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((date, i) => {
              if (!date) return <div key={i} className="min-h-20 border-b border-r border-slate-100" />;
              const itens = itensPorDia.get(date.toDateString()) ?? [];
              const isHoje = date.toDateString() === hoje.toDateString();
              return (
                <div key={i} className={`min-h-20 border-b border-r border-slate-100 p-1 ${itens.length ? "bg-amber-50/40" : ""}`}>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${isHoje ? "bg-navy-700 text-white" : "text-muted"}`}>{date.getDate()}</span>
                  <div className="mt-1 space-y-0.5">
                    {itens.slice(0, 3).map((it, j) => (
                      <div key={j} className={`truncate rounded px-1 text-[10px] ${it.tipo === "prazo" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`} title={it.titulo}>
                        {it.titulo}
                      </div>
                    ))}
                    {itens.length > 3 && <div className="text-[10px] text-muted">+{itens.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Linha do tempo</h4>
            <div className="space-y-1.5">
              {meses.map((i) => (
                <div key={i.chave} className="flex items-center gap-2">
                  <span className={`w-40 shrink-0 truncate text-xs ${i.tipo === "prazo" ? "font-medium text-navy-900" : "text-muted"}`}>{i.titulo}</span>
                  <div className="relative h-4 flex-1 rounded bg-slate-100">
                    <div
                      className={`absolute top-0 h-4 rounded ${i.tipo === "prazo" ? "bg-amber-400" : "bg-blue-400"}`}
                      style={{ left: `${i.left}%`, width: `${i.width}%` }}
                    />
                  </div>
                </div>
              ))}
              {meses.length === 0 && <p className="text-xs text-muted">Nada no mês.</p>}
            </div>
          </div>
        </Card>
      )}

      {aba === "alertas" && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {vencidos.map((p) => (
              <li key={p.id} className="px-5 py-3"><p className="text-sm text-navy-900"><Badge tone="red">vencido</Badge> {p.descricao} {p.processoNumero ? `· ${p.processoNumero}` : ""}</p></li>
            ))}
            {dentroAlerta.map((p) => (
              <li key={p.id} className="px-5 py-3"><p className="text-sm text-navy-900"><Badge tone="amber">próx. do venc.</Badge> {p.descricao} {p.processoNumero ? `· ${p.processoNumero}` : ""} — até {p.dataCalculadaAtual ? new Date(p.dataCalculadaAtual).toLocaleDateString("pt-BR") : "—"}</p></li>
            ))}
            {vencidos.length === 0 && dentroAlerta.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Tudo em dia. Nenhum alerta de prazo.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
