"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui";
import { ProcessoRowActions } from "@/components/processos/ProcessoRowActions";
import { SelecaoLote, LinhaSelecionavel, BarraLote } from "@/components/cadastro/SelecaoLote";
import { statusAmbiental } from "@/lib/status";

type Processo = {
  id: number;
  numero: string;
  apelido: string | null;
  nup: string | null;
  natureza: string;
  fase: string | null;
  modalidade: string | null;
  numeroLicenca: string | null;
  substancias: string | null;
  status: string;
  validade: Date | null;
  dataLimiteRenovacao: Date | null;
  dataProtocolo: Date | null;
  dataAbertura: Date;
  orgao: { sigla: string };
  responsavel: { nome: string } | null;
  empreendimento: { id: number; nome: string; apelido: string | null } | null;
  _count: { eventos: number; prazos: number; tarefas: number };
  notificacoes: { id: number }[];
};

const STATUS_OPTS = [
  { value: "ativo", label: "Ativo" },
  { value: "encerrado", label: "Encerrado" },
  { value: "em_renovacao", label: "Em Renovação" },
  { value: "proximo_vencimento", label: "Próximo do Vencimento" },
  { value: "paralisado", label: "Paralisado" },
  { value: "morto", label: "Morto" },
];

function norm(s: string | null | undefined) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ProcessosFiltro({
  processos,
  podeExcluir,
}: {
  processos: Processo[];
  podeExcluir: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [statusSel, setStatusSel] = useState<string[]>([]);
  const [natSel, setNatSel] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  function toggleStatus(v: string) {
    setStatusSel((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }
  function toggleNat(v: string) {
    setNatSel((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }

  const filtrados = useMemo(() => {
    const b = norm(busca);
    return processos.filter((p) => {
      const st = p.natureza === "ambiental" ? statusAmbiental(p.validade, p.status, p.dataLimiteRenovacao, p.dataProtocolo) : p.status;
      if (statusSel.length > 0 && !statusSel.includes(st)) return false;
      if (natSel.length > 0 && !natSel.includes(p.natureza)) return false;
      if (b) {
        const texto = norm([p.numero, p.apelido, p.nup, p.fase, p.modalidade, p.numeroLicenca, p.substancias, p.responsavel?.nome, p.empreendimento?.nome, p.empreendimento?.apelido, p.orgao.sigla].filter(Boolean).join(" "));
        if (!texto.includes(b)) return false;
      }
      return true;
    });
  }, [processos, busca, statusSel, natSel]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAjustada = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAjustada - 1) * POR_PAGINA, paginaAjustada * POR_PAGINA);

  return (
    <Card>
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número, apelido, NUP, empreendimento, responsável..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
              <input type="checkbox" checked={statusSel.length > 0} readOnly className="h-3.5 w-3.5 accent-navy-700" /> Status <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute z-20 mt-1 w-52 space-y-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              {STATUS_OPTS.map((s) => (
                <label key={s.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={statusSel.includes(s.value)} onChange={() => toggleStatus(s.value)} className="h-3.5 w-3.5 accent-navy-700" />
                  {s.label}
                </label>
              ))}
            </div>
          </details>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <input type="checkbox" checked={natSel.includes("ambiental")} onChange={() => toggleNat("ambiental")} className="h-3.5 w-3.5 accent-navy-700" />
            Processo Ambiental
          </label>
          <label className="flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <input type="checkbox" checked={natSel.includes("minerario")} onChange={() => toggleNat("minerario")} className="h-3.5 w-3.5 accent-navy-700" />
            Processo Minerário
          </label>
          {(busca || statusSel.length > 0 || natSel.length > 0) && (
            <button
              type="button"
              onClick={() => { setBusca(""); setStatusSel([]); setNatSel([]); setPagina(1); }}
              className="text-xs font-medium text-navy-600 hover:underline"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <SelecaoLote rota="/api/processos/excluir-lote" permitido={!!podeExcluir}>
        <BarraLote />
        <ul className="divide-y divide-slate-200">
          {visiveis.map((p) => (
            <LinhaSelecionavel key={p.id} id={p.id}>
              <div className="relative">
                <ProcessoRowActions processo={p} podeExcluir={podeExcluir} temNovaMovimentacao={p.natureza === "minerario" && p.notificacoes.length > 0} />
              </div>
            </LinhaSelecionavel>
          ))}
          {filtrados.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum processo encontrado.
            </li>
          )}
        </ul>
        {totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm">
            <p className="text-xs text-muted">Página {paginaAjustada} de {totalPaginas} · {filtrados.length} processo(s)</p>
            <div className="flex items-center gap-1">
              {paginaAjustada > 1 && (
                <button type="button" onClick={() => setPagina(paginaAjustada - 1)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">‹ Anterior</button>
              )}
              {[...new Set([
                1, totalPaginas,
                ...Array.from({ length: 5 }, (_, i) => paginaAjustada - 2 + i),
              ].filter((p) => p >= 1 && p <= totalPaginas))].sort((a, b) => a - b).map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && p - arr[idx - 1] > 1 && <span className="text-muted">…</span>}
                  <button
                    type="button"
                    onClick={() => setPagina(p)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${p === paginaAjustada ? "bg-navy-100 text-navy-900 ring-1 ring-navy-300" : "text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                  >
                    {p}
                  </button>
                </span>
              ))}
              {paginaAjustada < totalPaginas && (
                <button type="button" onClick={() => setPagina(paginaAjustada + 1)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">Próxima ›</button>
              )}
            </div>
          </div>
        )}
      </SelecaoLote>
    </Card>
  );
}
