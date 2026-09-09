"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CheckCheck } from "lucide-react";

export function MarcarTodasLidas() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function marcar() {
    setLoading(true);
    await fetch("/api/notificacoes/marcar-lidas", { method: "POST" });
    setLoading(false);
    router.refresh();
  }
  return (
    <Button variant="secondary" onClick={marcar} disabled={loading}>
      <CheckCheck className="h-4 w-4" /> {loading ? "Marcando..." : "Marcar todas como lidas"}
    </Button>
  );
}
