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
  // Estado retornado pelo passo do popup para reutilizar a mesma sessão na consulta
  const cookies = (body.cookies as string ?? "").trim();
  const viewState = (body.viewState as string ?? "").trim();
  const viewStateGen = (body.viewStateGen as string ?? "").trim();
  const eventValidation = (body.eventValidation as string ?? "").trim();
  if (!numeroRaw) return NextResponse.json({ error: "Número do processo obrigatório (ex: 866.123/2024)" }, { status: 400 });

  // normaliza numero: mantém formato com ponto para o Cadastro Mineiro (ex: 815.310/2008)
  const m = numeroRaw.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m) {
    return NextResponse.json({ error: "Formato inválido. Use 000.000/0000" }, { status: 400 });
  }
  const numCompleto = `${m[1]}.${m[2]}/${m[3]}`; // formato com ponto para o input txtNumeroProcesso
  const num = m[1] + m[2];
  const ano = m[3];

  const base = "https://sistemas.anm.gov.br";
  const url = `${base}/SCM/extra/site/admin/dadosProcesso.aspx`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  // Se veio código manual, usa a MESMA sessão do popup (cookies/estado recebidos) para o POST
  if (codigoManual) {
    try {
      if (!cookies || !viewState) {
        return NextResponse.json({ error: "Sessão expirada. Clique em Buscar CM novamente." }, { status: 422 });
      }
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

  // Fluxo popup: retorna captcha URL + sessão (cookies/estado) para reusar na consulta
  try {
    const getRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal, cache: "no-store" });
    const cookiesRes = getRes.headers.get("set-cookie") ?? "";
    const html = await getRes.text();
    const vs = extractInput(html, "__VIEWSTATE");
    const vsg = extractInput(html, "__VIEWSTATEGENERATOR");
    const ev = extractInput(html, "__EVENTVALIDATION");
    const guid = extractCaptchaGuid(html);
    if (guid) {
      const captchaUrl = `${base}/SCM/extra/CaptchaImage.aspx?guid=${guid}`;
      return NextResponse.json({
        ok: false,
        modo: "captcha_popup",
        mensagem: "Digite o código da imagem para buscar no Cadastro Mineiro.",
        numero: numCompleto,
        captchaUrl,
        viewState: vs,
        viewStateGen: vsg,
        eventValidation: ev,
        cookies: cookiesRes,
      }, { status: 422 });
    }
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "ANM demorou para responder. Você pode preencher NUP e área manualmente e salvar." : "Cadastro Mineiro indisponível. Preencha NUP e área manualmente.";
    return NextResponse.json({ ok: false, modo: "manual_fallback", mensagem: msg, numero: numCompleto }, { status: 200 });
  } finally {
    clearTimeout(timeout);
  }
}
