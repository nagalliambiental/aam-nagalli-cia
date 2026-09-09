"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExcluirFatura({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function excluir() {
    if (!window.confirm("Excluir esta fatura? Ela será removida da listagem, mas permanecerá no histórico do sistema.")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/faturas/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível excluir a fatura.");
      router.push("/faturas");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return <button type="button" onClick={excluir} disabled={loading} className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50">{loading ? "Excluindo..." : "Excluir"}</button>;
}
