import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const BASE = "https://sistemas.anm.gov.br";
const URL_CM = `${BASE}/SCM/extra/site/admin/dadosProcesso.aspx`;

/**
 * Proxy do formulário do Cadastro Mineiro: baixa o ASPX da ANM, reescrita os
 * recursos para URLs absolutas e injeta um script que preenche o número do
 * processo automaticamente. O envio do formulário segue direto para a ANM,
 * como se fosse digitado pelo usuário (o captcha é resolvido manualmente).
 */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const numero = decodeURIComponent(id).trim();
  const m = numero.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  const numCompleto = `${m[1]}.${m[2]}/${m[3]}`;

  try {
    const res = await fetch(URL_CM, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    let html = await res.text();

    // Remove scripts da ANM (mantém o layout) e torna os recursos relativos absolutos
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/(src|href)=["']\/(?!\/)([^"']+)["']/gi, `$1="${BASE}/$2"`);

    // Prefill do número do processo
    const script = `<script>(function(){var c=document.getElementById("ctl00_conteudo_txtNumeroProcesso")||document.querySelector("input[id*='txtNumeroProcesso']");if(c){c.value=${JSON.stringify(numCompleto)};c.focus();}})();</script>`;
    const body = html.replace(/<\/body>/i, `${script}</body>`);

    return new NextResponse(body, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao proxear a ANM" }, { status: 502 });
  }
}
