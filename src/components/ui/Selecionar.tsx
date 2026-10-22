"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type OpcaoSelecionar = {
  value: string;
  label: ReactNode;
  grupo?: string;
};

function texto(o: OpcaoSelecionar): string {
  return typeof o.label === "string" ? o.label : String(o.value);
}

// Normaliza removendo acentos, caixa e espaços extras para busca por similaridade:
// "MAR" encontra "MARIA", "MARCELA", "MARÍLIA"...
function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function Selecionar({
  id,
  value,
  onChange,
  opcoes,
  emptyValue,
  emptyLabel = "— nenhum —",
  placeholder = "Buscar...",
  disabled = false,
  required = false,
  className = "",
}: {
  id?: string;
  value?: string;
  onChange: (v: string) => void;
  opcoes: OpcaoSelecionar[];
  emptyValue?: string;
  emptyLabel?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [posicao, setPosicao] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const filtros = useMemo(() => {
    const t = norm(termo);
    const textoVazio = typeof emptyLabel === "string" ? norm(emptyLabel) : emptyLabel == null ? "" : "@@objeto@@";
    let todas: OpcaoSelecionar[] = [];
    if (emptyValue != null && (t === "" || textoVazio.includes(t))) {
      todas.push({ value: emptyValue, label: emptyLabel, grupo: " " });
    }
    const base = t ? opcoes.filter((o) => norm(texto(o)).includes(t) || norm(String(o.value)).includes(t)) : opcoes;
    todas = todas.concat(base);
    return todas;
  }, [opcoes, termo, emptyValue, emptyLabel]);
  const grupos = useMemo(() => {
    const ordem: string[] = [];
    const mapa = new Map<string, OpcaoSelecionar[]>();
    for (const o of filtros) {
      const g = o.grupo ?? "";
      if (!mapa.has(g)) { mapa.set(g, []); ordem.push(g); }
      mapa.get(g)!.push(o);
    }
    return ordem.map((g) => ({ nome: g, itens: mapa.get(g)! }));
  }, [filtros]);

  const selecionada = opcoes.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => { document.removeEventListener("mousedown", fora); clearTimeout(t); };
  }, [aberto]);

  useEffect(() => {
    setPosicao(0);
  }, [termo, aberto]);

  useEffect(() => {
    if (!aberto || !listaRef.current) return;
    const item = listaRef.current.children[posicao] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [posicao, aberto]);

  function escolher(v: string) {
    onChange(v);
    setAberto(false);
    setTermo("");
  }

  function atalhos(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); setAberto(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setPosicao((p) => Math.min(p + 1, filtros.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setPosicao((p) => Math.max(p - 1, 0)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const alvo = filtros[posicao];
      if (alvo) escolher(String(alvo.value));
    }
  }

  const baseBotao = "flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm transition";
  const corBorda = aberto ? "border-navy-700 ring-2 ring-navy-700/20" : "border-slate-300 hover:border-slate-400";

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={(e) => { if (!aberto && (e.key === "Enter" || e.key === "ArrowDown")) { e.preventDefault(); setAberto(true); } }}
        className={`${baseBotao} ${corBorda} ${disabled ? "cursor-not-allowed bg-slate-50 opacity-60" : "cursor-pointer"}`}
      >
        <span className={`truncate ${selecionada ? "text-navy-900" : "text-slate-400"}`}>
          {selecionada ? selecionada.label : (emptyValue == null ? placeholder : emptyLabel)}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {/* Observa o asterisco de obrigatório sem atrapalhar validação nativa */}
      {required && <span className="hidden" data-required="1">*{value}</span>}

      {aberto && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={atalhos}
              placeholder={placeholder}
              className="w-full bg-transparent py-2 pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <ul ref={listaRef} className="max-h-64 overflow-y-auto">
            {grupos.map((g) => (
              <li key={g.nome === " " ? "__vazio__" : g.nome} className="contents">
                {g.nome !== "" && (
                  <p className={`sticky top-0 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${g.nome === " " ? "bg-slate-50 text-muted" : "bg-slate-100 text-muted"}`}>
                    {g.nome === " " ? "\u00a0" : g.nome}
                  </p>
                )}
                <div className="contents">
                  {g.itens.map((o) => {
                    const idx = filtros.indexOf(o);
                    const ativoSel = String(o.value) === String(value);
                    return (
                      <button
                        type="button"
                        key={`${g.nome}-${o.value}`}
                        onClick={() => escolher(String(o.value))}
                        onMouseEnter={() => setPosicao(idx)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${idx === posicao ? "bg-slate-50" : "bg-white"} ${ativoSel ? "font-medium text-navy-900" : "text-navy-800"}`}
                      >
                        <span className="truncate">{o.label}</span>
                        {ativoSel && <Check className="h-3.5 w-3.5 shrink-0 text-navy-700" />}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
            {filtros.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">Nada encontrado para "{termo.trim()}"</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
