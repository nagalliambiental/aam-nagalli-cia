"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Select } from "@/components/ui";
import { Printer } from "lucide-react";

const STATUS: Record<string, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  aberto: { label: "Aberto", tone: "blue" },
  enviado: { label: "Enviado", tone: "amber" },
  pago: { label: "Pago", tone: "green" },
  cancelado: { label: "Cancelado", tone: "gray" },
};

export function PedidoStatusUpdate({ pedidoId, status }: { pedidoId: number; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const st = STATUS[status] ?? { label: status, tone: "gray" as const };

  async function mudar(valor: string) {
    setLoading(true);
    await fetch(`/api/pedidos/${pedidoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: valor }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Badge tone={st.tone}>{st.label}</Badge>
      <Select value={status} onChange={(e) => mudar(e.target.value)} disabled={loading} className="w-36 text-xs">
        <option value="aberto">Aberto</option>
        <option value="enviado">Enviado</option>
        <option value="pago">Pago</option>
        <option value="cancelado">Cancelado</option>
      </Select>
    </div>
  );
}

export function PedidoImprimir() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Imprimir
    </Button>
  );
}
