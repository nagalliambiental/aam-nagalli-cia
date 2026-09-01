"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

type Mov = { data: string; hora: string; unidade: string; descricao: string };

export function SeiSyncPanel({ processoId, nup }: { processoId: number; nup: string | null }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [andamentos, setAndamentos] = useState<Mov[] | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [sessao, setSessao] = useState<{ cookies: string; cid: string } | null>(null);

  async function sync(codigoOverride?: string) {
    setLoading(true);
    setMsg(null);
    setAndamentos(null);
    const res = await fetch(`/api/processos/${processoId}/sei/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        codigoOverride
          ? { codigo: codigoOverride, cookies: sessao?.cookies, cid: sessao?.cid }
          : {}
      ),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || d.ok === false) {
      if (d.modo === "captcha_manual" && d.captchaBase64) {
        setCaptcha(d.captchaBase64);
        setSessao({ cookies: d.cookies ?? "", cid: d.cid ?? "" });
        setMsg(d.mensagem ?? "Digite o código da imagem.");
        return;
      }
      setMsg(d.mensagem ?? d.error ?? "Não foi possível sincronizar automaticamente.");
      return;
    }
    setCaptcha(null);
    setCodigo("");
    setSessao(null);
    setAndamentos(d.andamentos ?? []);
    setMsg(d.mensagem ?? (d.andamentos?.length ? "Movimentações encontradas no SEI." : "Nenhuma movimentação nova. Processo em dia no SEI."));
  }

  function confirmarCaptcha() {
    if (!codigo.trim()) { setMsg("Digite o código da imagem."); return; }
    sync(codigo.trim());
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
        <Button onClick={() => sync()} disabled={loading} variant="secondary">
          {loading ? "Consultando..." : "Verificar movimentação"}
        </Button>
      </div>

      {captcha && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={captcha} alt="captcha" className="h-10 rounded border border-slate-300 bg-white" />
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código" className="w-24" maxLength={6} />
          <Button variant="secondary" onClick={confirmarCaptcha} disabled={loading || !codigo}>Confirmar</Button>
        </div>
      )}

      {msg && <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-navy-900 ring-1 ring-slate-200">{msg}</p>}

      {andamentos && andamentos.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
          <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Resultado da consulta
          </p>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Data/Hora</th>
                  <th className="px-3 py-2 font-semibold">Unidade</th>
                  <th className="px-3 py-2 font-semibold">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {andamentos.map((a, i) => (
                  <tr key={i} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                      {a.data}{a.hora ? ` ${a.hora}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs font-medium">{a.unidade}</td>
                    <td className="px-3 py-2">{a.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!nup && <p className="mt-2 text-xs text-amber-700">Cadastre o NUP no processo para consulta direta no SEI.</p>}
    </div>
  );
}
