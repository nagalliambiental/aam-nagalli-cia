"use client";

import { useEffect, useRef, useState } from "react";

const URL_CM = "https://sistemas.anm.gov.br/SCM/extra/site/admin/dadosProcesso.aspx";

/**
 * Espelho da página do Cadastro Mineiro (ANM) num iframe.
 * - Sem barra de rolagem horizontal: o conteúdo se ajusta à largura disponível.
 * - Altura generosa com rolagem vertical interna.
 */
export function CadastroMineiroPanel({ numero }: { numero: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [altura, setAltura] = useState(1400);
  const [acesso, setAcesso] = useState<"checando" | "ok" | "bloqueado">("checando");

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const lerAltura = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body?.scrollHeight) {
          setAcesso("ok");
          setAltura(Math.max(doc.body.scrollHeight + 24, 900));
        }
      } catch {
        setAcesso("bloqueado");
      }
    };

    const onLoad = () => lerAltura();
    const interval = setInterval(lerAltura, 1200);
    const timeout = setTimeout(() => setAcesso((atual) => (atual === "checando" ? "bloqueado" : atual)), 8000);
    iframe.addEventListener("load", onLoad);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      iframe.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <iframe
          ref={iframeRef}
          src={URL_CM}
          title={`Cadastro Mineiro — ${numero}`}
          className="w-full border-0"
          style={{ height: altura, overflowX: "hidden" }}
        />
      </div>
    </div>
  );
}
