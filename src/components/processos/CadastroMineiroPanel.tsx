"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, Input } from "@/components/ui";

type SessaoCm = { cookies?: string; viewState?: string; viewStateGen?: string; eventValidation?: string };

export function CadastroMineiroPanel({ numero }: { numero: string }) {
  const router = useRouter();
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [sessao, setSessao] = useState<SessaoCm>({});
  const [mirror, setMirror] = useState<{ css: string[]; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function consultar(codigoEnviado?: string) {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/processos/cadastro-mineiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        ...(codigoEnviado ? { codigo: codigoEnviado } : {}),
        cookies: sessao.cookies,
        viewState: sessao.viewState,
        viewStateGen: sessao.viewStateGen,
        eventValidation: sessao.eventValidation,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (d.ok === true) {
      setCaptcha(null);
      setCodigo("");
      setMirror(d.body ? { css: d.css ?? [], body: d.body } : null);
      setMsg(d.mensagem ?? "Espelho atualizado.");
      router.refresh();
      return;
    }
    if (d.modo === "captcha_manual" && d.captchaBase64) {
      setCaptcha(d.captchaBase64);
      setSessao({ cookies: d.cookies, viewState: d.viewState, viewStateGen: d.viewStateGen, eventValidation: d.eventValidation });
      setMsg(d.mensagem ?? "Digite o código da imagem.");
      return;
    }
    setMsg(d.mensagem ?? d.error ?? "Não foi possível consultar o Cadastro Mineiro.");
  }

  return (
    <Card>
      <CardHeader
        title="Cadastro Mineiro — ANM"
        subtitle={`Consulta oficial do processo ${numero}`}
        actions={
          <a href="https://sistemas.anm.gov.br/SCM/extra/site/admin/dadosProcesso.aspx" target="_blank" rel="noreferrer" className="text-xs font-medium text-navy-600 hover:underline">
            Abrir na ANM ↗
          </a>
        }
      />
      <div className="space-y-3 border-b border-slate-200 p-5">
        {captcha && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={captcha} alt="captcha ANM" className="h-10 rounded border border-slate-300 bg-white" />
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={8} placeholder="Código" className="w-28" />
            <Button variant="secondary" onClick={() => consultar(codigo.trim())} disabled={loading || !codigo.trim()}>
              {loading ? "Consultando..." : "Confirmar código"}
            </Button>
          </div>
        )}
        <Button onClick={() => consultar()} disabled={loading}>
          {loading ? "Consultando..." : "Buscar dados na ANM"}
        </Button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>

      {mirror && (
        <div>
          <p className="px-5 pt-4 text-xs text-muted">Página espelhada do Cadastro Mineiro. Use a barra horizontal para navegar.</p>
          {mirror.css.map((href) => <link key={href} rel="stylesheet" href={href} />)}
          <div className="overflow-x-auto p-5">
            <div style={{ minWidth: 1360, maxWidth: "none" }} dangerouslySetInnerHTML={{ __html: mirror.body }} />
          </div>
        </div>
      )}
    </Card>
  );
}
