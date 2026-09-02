"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";

export function TarefaStatusBotao({
  tarefaId,
  status,
}: {
  tarefaId: number;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const concluida = status === "concluida";

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/tarefas/${tarefaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: concluida ? "pendente" : "concluida" }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 transition hover:bg-slate-100 disabled:opacity-50 ${
        concluida
          ? "text-slate-500 ring-slate-200"
          : "text-emerald-700 ring-emerald-200"
      }`}
      title={concluida ? "Reabrir tarefa" : "Marcar como concluída"}
    >
      {concluida ? (
        <>
          <RotateCcw className="h-3.5 w-3.5" /> Reabrir
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
        </>
      )}
    </button>
  );
}
