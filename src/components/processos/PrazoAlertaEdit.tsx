"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";

export function PrazoAlertaEdit({
  processoId,
  prazoId,
  alertaDias,
}: {
  processoId: number;
  prazoId: number;
  alertaDias: number | null;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [valor, setValor] = useState(String(alertaDias ?? 30));
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setLoading(true);
    const res = await fetch(`/api/processos/${processoId}/prazos/${prazoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertaDias: Number(valor) }),
    });
    setLoading(false);
    if (res.ok) {
      setEdit(false);
      router.refresh();
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      {edit ? (
        <>
          <input
            type="number"
            min="1"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs"
            autoFocus
          />
          <button onClick={salvar} disabled={loading} title="Salvar" className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setEdit(false); setValor(String(alertaDias ?? 30)); }} title="Cancelar" className="rounded p-0.5 text-slate-400 hover:bg-slate-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="text-xs text-muted">alerta {alertaDias ?? 30}d</span>
          <button onClick={() => setEdit(true)} title="Editar alerta" className="rounded p-0.5 text-slate-400 hover:bg-slate-100">
            <Pencil className="h-3 w-3" />
          </button>
        </>
      )}
    </span>
  );
}
