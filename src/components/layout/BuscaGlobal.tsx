"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, CornerDownLeft, Loader2 } from "lucide-react";

type Hit = {
  tipo: "processo" | "tarefa" | "empreendimento" | "empresa";
  id: number;
  titulo: string;
  subtitulo: string | null;
  url: string;
};

const GRUPOS: { tipo: Hit["tipo"]; label: string }[] = [
  { tipo: "processo", label: "Processos" },
  { tipo: "tarefa", label: "Tarefas" },
  { tipo: "empreendimento", label: "Empreendimentos" },
  { tipo: "empresa", label: "Empresas" },
];

export function BuscaGlobal() {
  const [q, setQ] = useState("");
  const [itens, setItens] = useState<Hit[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) {
      setItens([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(termo)}`);
        if (res.ok) {
          const dados = await res.json();
          setItens(Array.isArray(dados.resultados) ? dados.resultados : []);
          setAberto(true);
        }
      } finally {
        setCarregando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const grupos = useMemo(() => {
    return GRUPOS.map((g) => ({ ...g, itens: itens.filter((i) => i.tipo === g.tipo) })).filter((g) => g.itens.length > 0);
  }, [itens]);

  const primeiro = itens[0];

  function fechar() {
    setAberto(false);
    setQ("");
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => itens.length > 0 && setAberto(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && primeiro) {
            e.preventDefault();
            fechar();
            window.location.href = primeiro.url;
          }
        }}
        placeholder="Buscar processo, tarefa, empreendimento..."
        aria-label="Busca global"
        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-16 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-flex">
        Ctrl K
      </span>

      {aberto && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[26rem] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {carregando && itens.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </div>
          ) : itens.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">Nenhum resultado encontrado.</div>
          ) : (
            <>
              {grupos.map((g) => (
                <div key={g.tipo}>
                  <p className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700">
                    {g.label}
                  </p>
                  {g.itens.map((i) => (
                    <Link
                      key={`${g.tipo}-${i.id}`}
                      href={i.url}
                      onClick={fechar}
                      className="block border-b border-slate-100 px-4 py-2.5 last:border-0 hover:bg-slate-50"
                    >
                      <p className="truncate text-sm font-medium text-navy-900">{i.titulo}</p>
                      {i.subtitulo && <p className="truncate text-xs text-muted">{i.subtitulo}</p>}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="flex items-center justify-end gap-1 px-4 py-1.5 text-[11px] text-muted">
                <CornerDownLeft className="h-3 w-3" /> ir para o primeiro resultado
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
