"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";

export function PrazoStatusButton({
  processoId,
  prazoId,
  status,
}: {
  processoId: number;
  prazoId: number;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const concluido = status === "concluido";
  const cancelado = status === "cancelado";

  async function alternar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/processos/${processoId}/prazos/${prazoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          concluido
            ? { status: "em_andamento", dataEfetiva: null }
            : { status: "concluido", dataEfetiva: new Date().toISOString() }
        ),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (concluido) {
    return (
      <button
        type="button"
        onClick={alternar}
        disabled={loading}
        title="Reabrir (voltar a pendente)"
        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
      >
        <Check className="h-3.5 w-3.5" /> cumprido
        <Undo2 className="ml-1 h-3.5 w-3.5 opacity-70" />
      </button>
    );
  }
  if (cancelado) return null;

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={loading}
      title="Marcar como cumprido"
      className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-100"
    >
      <Check className="h-3.5 w-3.5" /> {loading ? "..." : "Concluir"}
    </button>
  );
}
