import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function extractInput(html: string, name: string): string {
  const re = new RegExp(`name="${name.replace(/\$/g, "\\$")}"[^>]*value="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1] : "";
}

function extractCaptchaGuid(html: string): string | null {
  const m = html.match(/CaptchaImage\.aspx\?guid=([a-f0-9-]+)/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const numeroRaw = (body.numero as string ?? "").trim();
  const codigoManual = (body.codigo as string ?? "").trim();
  if (!numeroRaw) return NextResponse.json({ error: "Número do processo obrigatório (ex: 866.123/2024)" }, { status: 400 });

  // normaliza numero: mantém formato com ponto para o Cadastro Mineiro (ex: 815.310/2008)
  const m = numeroRaw.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m) {
    return NextResponse.json({ error: "Formato inválido. Use 000.000/0000" }, { status: 400 });
  }
  const numCompleto = `${m[1]}.${m[2]}/${m[3]}`; // formato com ponto para o input txtNumeroProcesso
  const num = m[1] + m[2];
  const ano = m[3];

  // Se veio código manual do usuário, faz tentativa única com esse código
  if (codigoManual) {
    try {
      const base = "https://sistemas.anm.gov.br";
      const url = `${base}/SCM/extra/site/admin/dadosProcesso.aspx`;
      const getRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const cookies = getRes.headers.get("set-cookie") ?? "";
      const html = await getRes.text();
      const viewState = extractInput(html, "__VIEWSTATE");
      const viewStateGen = extractInput(html, "__VIEWSTATEGENERATOR");
      const eventValidation = extractInput(html, "__EVENTVALIDATION");
      const form = new URLSearchParams({
        __VIEWSTATE: viewState,
        __VIEWSTATEGENERATOR: viewStateGen,
        __EVENTVALIDATION: eventValidation,
        "ctl00$conteudo$txtNumeroProcesso": numCompleto,
        "ctl00$conteudo$CaptchaControl1": codigoManual,
        "ctl00$conteudo$btnConsultarProcesso": "Consultar",
      });
      const postRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies, "User-Agent": "Mozilla/5.0" },
        body: form.toString(),
      });
      const postHtml = await postRes.text();
      if (postHtml.includes("CaptchaImage.aspx") && postHtml.includes("Informe o código")) {
        return NextResponse.json({ ok: false, error: "Código incorreto. Tente novamente." }, { status: 422 });
      }
      const extrair = (label: string) => {
        const re = new RegExp(label + `[^<]*<[^>]*>([^<]+)`, "i");
        const mm = postHtml.match(re);
        return mm ? mm[1].trim() : "";
      };
      const nup = extrair("NUP:") || extrair("NUP");
      const areaHa = extrair("Área \\(ha\\):") || extrair("Área");
      const fase = extrair("Fase atual:");
      const substancias = extrair("Substâncias:");
      const municipios = extrair("Municípios:");
      const tipoReq = extrair("Tipo de requerimento:");
      if (nup || areaHa || fase) {
        return NextResponse.json({ ok: true, nup: nup || null, areaHa: areaHa ? parseFloat(areaHa.replace(",", ".")) : null, substancias: substancias || null, municipios: municipios || null, fase: fase || null, tipoRequerimento: tipoReq || null });
      }
      return NextResponse.json({ ok: false, error: "Processo não encontrado ou sem dados." }, { status: 404 });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
    }
  }

  // Fluxo: tenta buscar captcha, mas se falhar retorna fallback manual sem depender do ANM
  try {
    const base = "https://sistemas.anm.gov.br";
    const url = `${base}/SCM/extra/site/admin/dadosProcesso.aspx`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const getRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    const cookies = getRes.headers.get("set-cookie") ?? "";
    const html = await getRes.text();
    const guid = extractCaptchaGuid(html);
    if (guid) {
      const captchaUrl = `${base}/SCM/extra/CaptchaImage.aspx?guid=${guid}`;
      const capRes = await fetch(captchaUrl, { headers: { Cookie: cookies, "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
      const buf = Buffer.from(await capRes.arrayBuffer());
      const base64 = `data:image/jpeg;base64,${buf.toString("base64")}`;
      return NextResponse.json({
        ok: false,
        modo: "captcha_manual",
        mensagem: "Digite o código da imagem para consultar o Cadastro Mineiro.",
        numero: numCompleto,
        captchaBase64: base64,
      }, { status: 422 });
    }
  } catch (e) {
    // Fallback: ANM fora do ar ou timeout no serverless -> permite preenchimento manual
    const msg = e instanceof Error && e.name === "AbortError" ? "Tempo esgotado ao consultar ANM. Preencha NUP e área manualmente." : "Cadastro Mineiro indisponível no momento. Preencha NUP e área manualmente.";
    return NextResponse.json({
      ok: false,
      modo: "manual_fallback",
      mensagem: msg,
      numero: numCompleto,
    }, { status: 422 });
  }
  return NextResponse.json({
    ok: false,
    modo: "manual_fallback",
    mensagem: "Não foi possível carregar o captcha. Preencha NUP e área manualmente.",
    numero: numCompleto,
  }, { status: 422 });
}
