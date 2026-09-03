"use client";

import { Select } from "@/components/ui";

export type ProcOpt = { id: number; numero: string; fase?: string | null };

export function VinculoPicker({
  titulo,
  opcoes,
  valor,
  onChange,
}: {
  titulo: string;
  opcoes: ProcOpt[];
  valor: number[];
  onChange: (ids: number[]) => void;
}) {
  const disponiveis = opcoes.filter((o) => !valor.includes(o.id));

  function adicionar(id: string) {
    if (!id) return;
    const num = Number(id);
    if (!valor.includes(num)) onChange([...valor, num]);
  }
  function remover(id: number) {
    onChange(valor.filter((x) => x !== id));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <LabelBlock titulo={titulo} />
      <Select value="" onChange={(e) => adicionar(e.target.value)}>
        <option value="">— selecionar {titulo.split(" com ")[0]} —</option>
        {disponiveis.map((o) => (
          <option key={o.id} value={o.id}>
            #{o.numero}{o.fase ? ` · ${o.fase}` : ""}
          </option>
        ))}
      </Select>
      <div className="mt-2 flex flex-wrap gap-2">
        {valor.map((id) => {
          const proc = opcoes.find((o) => o.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-navy-800 ring-1 ring-slate-200">
              #{proc?.numero ?? id}
              <button type="button" onClick={() => remover(id)} className="text-slate-400 hover:text-red-600" title="Remover">
                ×
              </button>
            </span>
          );
        })}
        {valor.length === 0 && <span className="text-xs text-muted">Nenhum processo vinculado.</span>}
      </div>
    </div>
  );
}

function LabelBlock({ titulo }: { titulo: string }) {
  return <label className="mb-1 block text-sm font-medium text-slate-700">{titulo}</label>;
}
