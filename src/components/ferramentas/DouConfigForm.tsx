"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export function DouConfigForm() {
  const [hora, setHora] = useState("");
  const [termosExtras, setTermosExtras] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetch("/api/ferramentas/dou/config", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.hora) setHora(d.hora); if (typeof d.termosExtras === "string") setTermosExtras(d.termosExtras); if (d.error) setMsg(d.error); }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    const response = await fetch("/api/ferramentas/dou/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hora, termosExtras }) });
    const data = await response.json().catch(() => ({}));
    setMsg(response.ok ? "Cron atualizado no GitHub. O próximo disparo seguirá o novo horário." : data.error ?? "Não foi possível atualizar.");
    setLoading(false);
  }
  return <form onSubmit={save} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div><Label htmlFor="dou-hora">Horário da captura (Brasília)</Label><Input id="dou-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} /><p className="mt-1 text-xs text-muted">O sistema converte automaticamente o horário de Brasília para o formato UTC do GitHub.</p></div><div><Label htmlFor="dou-termos">Termos adicionais de busca</Label><textarea id="dou-termos" value={termosExtras} onChange={(e) => setTermosExtras(e.target.value)} rows={5} placeholder="Um termo por linha" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /><p className="mt-1 text-xs text-muted">Cada linha será buscada exatamente no DOU, além dos termos automáticos.</p></div><Button type="submit" disabled={loading || !hora}>{loading ? "Salvando..." : "Salvar configurações"}</Button>{msg && <p className="text-sm text-muted">{msg}</p>}</form>;
}
