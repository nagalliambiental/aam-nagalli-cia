"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function SeiAtualizarTodos() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function atualizar() {
    setLoading(true); setMessage(null);
    const response = await fetch("/api/ferramentas/sei/sincronizar", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${data.consultados} processo(s) consultado(s), ${data.novosProtocolos} protocolo(s) novo(s) e ${data.novasMovimentacoes} movimentação(ões) nova(s).` : data.error ?? "Falha na consulta.");
    setLoading(false); router.refresh();
  }
  return <div className="flex flex-wrap items-center gap-3"><Button onClick={atualizar} disabled={loading}>{loading ? "Consultando todos..." : "Consultar todos os processos"}</Button>{message && <span className="text-xs text-muted">{message}</span>}</div>;
}
