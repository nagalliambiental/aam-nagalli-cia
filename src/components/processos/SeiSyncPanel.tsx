"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function SeiSyncPanel({ processoId, nup }: { processoId: number; nup: string | null }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMsg(null);
    setDetalhe(null);
    const res = await fetch(`/api/processos/${processoId}/sei/sync`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || d.ok === false) {
      setMsg(d.mensagem ?? d.error ?? "Não foi possível sincronizar automaticamente.");
      if (d.htmlPreview) setDetalhe(d.htmlPreview.slice(0, 800));
      return;
    }
    setMsg(d.criados > 0 ? `${d.criados} andamento(s) importado(s) para Eventos.` : "Nenhum andamento novo. Processo está em dia no SEI.");
    if (d.andamentos) setDetalhe(JSON.stringify(d.andamentos.slice(0, 3), null, 2));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-navy-900">SEI - Movimentações</h4>
          <p className="text-xs text-muted">
            {nup ? `NUP ${nup}` : "Sem NUP cadastrado"} · consulta pública (sem credencial)
          </p>
        </div>
        <Button onClick={sync} disabled={loading} variant="secondary">
          {loading ? "Consultando..." : "Verificar movimentação"}
        </Button>
      </div>
      {msg && <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-navy-900 ring-1 ring-slate-200">{msg}</p>}
      {detalhe && <pre className="mt-2 max-h-40 overflow-auto rounded bg-white p-3 text-xs text-muted ring-1 ring-slate-200">{detalhe}</pre>}
      {!nup && <p className="mt-2 text-xs text-amber-700">Cadastre o NUP no processo para consulta direta no SEI.</p>}
    </div>
  );
}
