"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function LegislacaoIatSincronizar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sincronizar() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/ferramentas/legislacao-iat/sincronizar", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setMessage(
      res.ok
        ? `${d.novas} nova(s), ${d.atualizadas} atualizada(s) e ${d.revogadas} revogada(s) — ${d.lidas} norma(s) verificada(s) no site do IAT.`
        : d.error ?? "Falha ao sincronizar.",
    );
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={sincronizar} disabled={loading}>
        {loading ? "Sincronizando..." : "Sincronizar agora"}
      </Button>
      {message && <span className="text-xs text-muted">{message}</span>}
    </div>
  );
}
