"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DeleteEmpresaButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Excluir (inativar) esta empresa?")) return;
    setLoading(true);
    const res = await fetch(`/api/empresas/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/empresas");
      router.refresh();
    } else {
      setLoading(false);
      alert("Erro ao excluir.");
    }
  }

  return (
    <Button variant="danger" onClick={handleDelete} disabled={loading}>
      {loading ? "Excluindo..." : "Excluir"}
    </Button>
  );
}
