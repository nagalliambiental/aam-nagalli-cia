"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { DouTermo } from "@/lib/dou-termos";

function rotuloOrigem(origem: string): string {
  switch (origem) {
    case "CNPJ do cliente": return "Clientes · CNPJ";
    case "CPF do cliente": return "Clientes · CPF";
    case "Razão social": return "Clientes · Razão social";
    case "Nome fantasia": return "Clientes · Nome fantasia";
    case "Empreendimento": return "Empreendimentos · Nome";
    case "NUP do processo": return "Processos · NUP";
    case "Número do processo": return "Processos · Número";
    case "Reativado": return "Outros";
    default: return "Outros";
  }
}

const ORDEM_GRUPOS = [
  "Clientes · CNPJ",
  "Clientes · CPF",
  "Clientes · Razão social",
  "Clientes · Nome fantasia",
  "Empreendimentos · Nome",
  "Processos · NUP",
  "Processos · Número",
  "Outros",
];

/**
 * Cura dos termos usados na busca do DOU:
 * - automáticos (cadastros): agrupados por origem, com busca e desativar/reativar;
 * - manuais: um por linha na caixa de texto — editáveis e removíveis livremente.
 */
export function DouTermosPainel({
  automaticos,
  manuaisIniciais,
  desativadosIniciais,
}: {
  automaticos: DouTermo[];
  manuaisIniciais: string[];
  desativadosIniciais: string[];
}) {
  const router = useRouter();
  const [chips, setChips] = useState<DouTermo[]>(automaticos);
  const [manuais, setManuais] = useState(manuaisIniciais.join("\n"));
  const [desativados, setDesativados] = useState<string[]>(desativadosIniciais);
  const [busca, setBusca] = useState("");
  const [grupoSel, setGrupoSel] = useState<string>("Todos");
  const [hora, setHora] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/ferramentas/dou/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.hora) setHora(d.hora); })
      .catch(() => {});
  }, []);

  function desativar(i: number) {
    const t = chips[i];
    setChips((arr) => arr.filter((_, x) => x !== i));
    setDesativados((arr) => [...arr, t.text]);
  }

  function reativar(i: number) {
    const t = desativados[i];
    setDesativados((arr) => arr.filter((_, x) => x !== i));
    setChips((arr) => [...arr, { text: t, origem: "Reativado", id: undefined }]);
  }

  async function salvar() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/ferramentas/dou/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hora: hora || "00:00", termosExtras: manuais, termosDesativados: desativados.join("\n") }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg("Termos atualizados. O worker do DOU busca por estes termos amanhã.");
      router.refresh();
    } else {
      setMsg(d.error ?? "Não foi possível salvar.");
    }
  }

  const temMudanca =
    desativados.join("\n").trim() !== desativadosIniciais.join("\n").trim() ||
    manuais.trim() !== manuaisIniciais.join("\n").trim();

  // Filtro da barra de busca + agrupamento por origem
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapa = new Map<string, { texto: string; indice: number }[]>();
    chips.forEach((t, i) => {
      if (termo && !t.text.toLowerCase().includes(termo)) return;
      const g = rotuloOrigem(t.origem);
      if (!mapa.has(g)) mapa.set(g, []);
      mapa.get(g)!.push({ texto: t.text, indice: i });
    });
    return ORDEM_GRUPOS.filter((g) => mapa.has(g)).map((g) => ({ nome: g, itens: mapa.get(g)! }));
  }, [chips, busca]);

  const desativadosVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return desativados.filter((t) => !termo || t.toLowerCase().includes(termo));
  }, [busca, desativados]);

  return (
    <div className="space-y-6 p-5">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Procurar termo..."
          className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
        />
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-navy-900">
            Termos automáticos <span className="text-xs font-normal text-muted">(dos cadastros · {chips.length} ativos)</span>
          </h3>
          {grupos.length > 0 && (
            <select
              value={grupoSel}
              onChange={(e) => setGrupoSel(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-navy-700"
            >
              <option value="Todos">Todos os grupos</option>
              {grupos.map((g) => (
                <option key={g.nome} value={g.nome}>{g.nome} ({g.itens.length})</option>
              ))}
            </select>
          )}
        </div>
        {grupos
          .filter((g) => grupoSel === "Todos" || g.nome === grupoSel)
          .map((g) => (
            <details key={g.nome} open className="rounded-md border border-slate-200">
              <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-navy-700 hover:bg-slate-50">
                <span className="flex items-center gap-1.5">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  {g.nome}
                </span>
                <span className="font-normal text-muted">
                  {g.itens.length} termo(s){g.itens.length === 0 ? "" : ""}
                </span>
              </summary>
              <div className="flex flex-wrap gap-1.5 border-t border-slate-100 p-3">
                {g.itens.map(({ texto, indice }) => (
                  <span key={`${g.nome}-${texto}-${indice}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-navy-800" title={texto}>
                    <span className="max-w-[16rem] truncate">{texto}</span>
                    <button
                      type="button"
                      onClick={() => desativar(indice)}
                      title="Desativar este termo nas buscas"
                      className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {g.itens.length === 0 && <p className="text-xs text-muted">Nenhum termo neste grupo.</p>}
              </div>
            </details>
          ))}
        {grupos.length === 0 && (
          <p className="text-sm text-muted">
            {busca.trim() ? `Nenhum termo automático encontrado para "${busca.trim()}".` : "Nenhum termo automático ativo."}
          </p>
        )}
      </section>

      {desativados.length > 0 && (
        <details className="rounded-md border border-slate-200">
          <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-navy-700 hover:bg-slate-50">
            <span className="flex items-center gap-1.5">
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              Desativados
            </span>
            <span className="font-normal text-muted">
              {desativadosVisiveis.length} de {desativados.length} · não pesquisados no DOU
            </span>
          </summary>
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 p-3">
            {desativados.map((t, i) => {
              const termo = busca.trim().toLowerCase();
              if (termo && !t.toLowerCase().includes(termo)) return null;
              return (
                <span key={`${t}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-navy-600">
                  <span className="max-w-[16rem] truncate" title={t}>{t}</span>
                  <button
                    type="button"
                    onClick={() => reativar(i)}
                    title="Reativar"
                    className="shrink-0 rounded-full p-0.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </details>
      )}

      <section>
        <div className="flex items-center justify-between">
          <Label htmlFor="dou-termos-manuais">Termos manuais (um por linha — edite e remova à vontade)</Label>
          <span className="text-xs text-muted">{manuais.trim() ? manuais.split(/\r?\n/).filter(Boolean).length : 0} manual(is)</span>
        </div>
        <textarea
          id="dou-termos-manuais"
          value={manuais}
          onChange={(e) => setManuais(e.target.value)}
          rows={5}
          placeholder="Um termo por linha"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </section>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={salvar} disabled={loading || !temMudanca}>
          {loading ? "Salvando..." : "Salvar termos"}
        </Button>
        {!temMudanca && <span className="text-xs text-muted">Nenhuma alteração pendente.</span>}
      </div>
      {msg && <p className="text-sm text-navy-700">{msg}</p>}
    </div>
  );
}
