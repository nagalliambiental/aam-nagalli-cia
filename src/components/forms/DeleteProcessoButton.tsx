"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DeleteProcessoButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Excluir (inativar) este processo? Esta ação pode ser desfeita pelo administrador.")) return;
    setLoading(true);
    const res = await fetch(`/api/processos/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/processos");
      router.refresh();
    } else {
      setLoading(false);
      alert("Erro ao excluir processo.");
    }
  }

  return (
    <Button variant="danger" onClick={handleDelete} disabled={loading}>
      {loading ? "Excluindo..." : "Excluir"}
    </Button>
  );
}
