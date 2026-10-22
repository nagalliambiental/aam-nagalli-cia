"use client";

import { Plus, X } from "lucide-react";
import { Selecionar, type OpcaoSelecionar } from "@/components/ui/Selecionar";
import { Label } from "@/components/ui";

/**
 * Seleção de responsáveis adicionais da tarefa (equipe).
 * Exclui o próprio responsável principal e quem já foi adicionado; usa
 * o mesmo select com busca por similaridade.
 */
export function SelecionarEquipe({
  pessoas,
  principalId,
  equipe,
  onChange,
}: {
  pessoas: { id: number; nome: string }[];
  principalId?: string;
  equipe: { id: string; nome: string }[];
  onChange: (proxima: { id: string; nome: string }[]) => void;
}) {
  const jaTem = new Set([...equipe.map((x) => x.id), principalId ?? ""].filter(Boolean));
  const disponiveis = pessoas.filter((p) => !jaTem.has(String(p.id)));
  const opcoes: OpcaoSelecionar[] = disponiveis.map((p) => ({ value: String(p.id), label: p.nome }));

  function adicionar(v: string) {
    if (!v) return;
    const p = pessoas.find((x) => String(x.id) === v);
    if (!p) return;
    onChange([...equipe, { id: v, nome: p.nome }]);
  }

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Responsáveis adicionais</p>
      {equipe.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {equipe.map((x) => (
            <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-1 text-xs font-medium text-navy-800">
              {x.nome}
              <button type="button" onClick={() => onChange(equipe.filter((e) => e.id !== x.id))} title="Remover" className="rounded-full p-0.5 hover:bg-navy-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {disponiveis.length > 0 ? (
        <Selecionar
          value=""
          onChange={adicionar}
          emptyValue=""
          emptyLabel={
            <span className="inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar responsável…</span>
          }
          placeholder="Buscar pessoa..."
          opcoes={opcoes}
        />
      ) : (
        <p className="text-xs text-muted">Todas as pessoas já estão na tarefa.</p>
      )}
    </div>
  );
}
