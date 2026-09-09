"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function RecebimentoFatura({ id, recebido }: { id: number; recebido: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function alterarRecebimento(next: boolean) {
    setLoading(true);
    try {
      const response = await fetch(`/api/faturas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recebido: next }),
      });
      if (!response.ok) throw new Error("Não foi possível atualizar o recebimento.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return recebido ? (
    <Button type="button" variant="ghost" onClick={() => alterarRecebimento(false)} disabled={loading}>
      {loading ? "Atualizando..." : "Desfazer recebimento"}
    </Button>
  ) : (
    <Button type="button" onClick={() => alterarRecebimento(true)} disabled={loading}>
      {loading ? "Registrando..." : "Acusar recebimento"}
    </Button>
  );
}
