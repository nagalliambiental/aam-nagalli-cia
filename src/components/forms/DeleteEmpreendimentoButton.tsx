"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DeleteEmpreendimentoButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Excluir (inativar) este empreendimento? Os processos vinculados não serão excluídos.")) return;
    setLoading(true);
    const response = await fetch(`/api/empreendimentos/${id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/empreendimentos");
      router.refresh();
    } else {
      setLoading(false);
      window.alert("Não foi possível excluir o empreendimento.");
    }
  }

  return <Button variant="danger" onClick={handleDelete} disabled={loading}>{loading ? "Excluindo..." : "Excluir"}</Button>;
}
