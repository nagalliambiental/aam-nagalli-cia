"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export function DouConfigForm() {
  const [cron, setCron] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetch("/api/ferramentas/dou/config", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.cron) setCron(d.cron); else if (d.error) setMsg(d.error); }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    const response = await fetch("/api/ferramentas/dou/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cron }) });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Cron atualizado no GitHub. O próximo disparo seguirá o novo horário." : data.error ?? "Não foi possível atualizar.");
    setLoading(false);
  }
  return <form onSubmit={save} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div><Label htmlFor="dou-cron">Expressão Cron do GitHub Actions</Label><Input id="dou-cron" value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 10 * * *" /><p className="mt-1 text-xs text-muted">O GitHub usa UTC. Exemplo: `0 10 * * *` executa diariamente às 07:00 no horário de Brasília.</p></div><Button type="submit" disabled={loading || !cron}>{loading ? "Salvando..." : "Salvar horário do Cron"}</Button>{msg && <p className="text-sm text-muted">{msg}</p>}</form>;
}
