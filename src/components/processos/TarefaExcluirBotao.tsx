"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function TarefaExcluirBotao({ tarefaId }: { tarefaId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function excluir() {
    if (!confirm("Excluir esta tarefa (e a exigência vinculada)?")) return;
    setLoading(true);
    const res = await fetch(`/api/tarefas/${tarefaId}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.push("/tarefas");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Erro ao excluir tarefa.");
    }
  }

  return (
    <button
      type="button"
      onClick={excluir}
      disabled={loading}
      title="Excluir"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> Excluir
    </button>
  );
}
