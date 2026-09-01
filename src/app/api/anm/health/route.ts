import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const URL_CM = "https://sistemas.anm.gov.br/SCM/extra/site/admin/dadosProcesso.aspx";

/**
 * Diagnóstico em produção: mostra de qual região do Vercel a função rodou,
 * se a ANM respondeu e se a página trouxe o captcha (sessão criada com sucesso).
 * A rota roda em gru1 (São Paulo) via vercel.json — o objetivo é um IP brasileiro
 * que passe no WAF da ANM.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const region = process.env.VERCEL_REGION ?? "local";
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(URL_CM, { headers: { "User-Agent": UA }, signal: controller.signal, cache: "no-store" });
      const html = await res.text();
      const hasGuid = /CaptchaImage\.aspx\?guid=([a-f0-9-]+)/i.test(html);
      const snippet = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160);
      return NextResponse.json({
        ok: res.status === 200 && hasGuid,
        region,
        anmStatus: res.status,
        captchaGuid: hasGuid,
        snippet,
      });
    } finally {
      clearTimeout(t);
    }
  } catch (e) {
    return NextResponse.json({
      ok: false,
      region,
      error: e instanceof Error ? e.message : "Erro ao acessar a ANM",
    });
  }
}