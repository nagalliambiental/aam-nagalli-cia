import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function solveCaptchaWithTesseract(buf: Buffer): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const { createWorker } = await import("tesseract.js");
    const processed = await sharp(buf).grayscale().threshold(150).normalize().toBuffer();
    const worker = await createWorker("eng");
    // @ts-ignore
    await worker.setParameters({ tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" });
    const { data } = await worker.recognize(processed);
    await worker.terminate();
    return data.text.trim().replace(/\s/g, "").slice(0, 6);
  } catch {
    return "";
  }
}

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
  if (!numeroRaw) return NextResponse.json({ error: "Número do processo obrigatório (ex: 866.123/2024)" }, { status: 400 });

  // normaliza numero: 860123/2024 ou 860.123/2024 -> 860123 e 2024
  const m = numeroRaw.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})|\b(\d{6})\/(\d{4})\b/);
  let num = "";
  let ano = "";
  if (m) {
    if (m[1] && m[2] && m[3]) { num = m[1] + m[2]; ano = m[3]; }
    else if (m[4] && m[5]) { num = m[4]; ano = m[5]; }
  }
  if (!num || !ano) {
    return NextResponse.json({ error: "Formato inválido. Use 000.000/0000" }, { status: 400 });
  }

  const base = "https://sistemas.anm.gov.br";
  const url = `${base}/SCM/extra/site/admin/dadosProcesso.aspx`;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      // 1) GET página para cookies + viewstate + captcha guid
      const getRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const cookies = getRes.headers.get("set-cookie") ?? "";
      const html = await getRes.text();
      const viewState = extractInput(html, "__VIEWSTATE");
      const viewStateGen = extractInput(html, "__VIEWSTATEGENERATOR");
      const eventValidation = extractInput(html, "__EVENTVALIDATION");
      const guid = extractCaptchaGuid(html);
      if (!guid || !viewState) {
        continue;
      }
      // 2) baixa captcha
      const captchaUrl = `${base}/SCM/extra/CaptchaImage.aspx?guid=${guid}`;
      const capRes = await fetch(captchaUrl, { headers: { Cookie: cookies, "User-Agent": "Mozilla/5.0" } });
      const capBuf = Buffer.from(await capRes.arrayBuffer());
      const codigo = await solveCaptchaWithTesseract(capBuf);
      if (!codigo || codigo.length < 3) continue;

      // 3) POST consulta
      const form = new URLSearchParams({
        __VIEWSTATE: viewState,
        __VIEWSTATEGENERATOR: viewStateGen,
        __EVENTVALIDATION: eventValidation,
        "ctl00$conteudo$txtNumero": num,
        "ctl00$conteudo$txtAno": ano,
        "ctl00$conteudo$txtCodigo": codigo,
        "ctl00$conteudo$btnConsultar": "Consultar",
      });

      const postRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
          "User-Agent": "Mozilla/5.0",
        },
        body: form.toString(),
      });
      const postHtml = await postRes.text();

      // se ainda contém captcha, falhou o OCR - tenta de novo
      if (postHtml.includes("CaptchaImage.aspx") && postHtml.includes("Informe o código")) {
        continue;
      }

      // extrai dados básicos
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

      // se conseguiu pelo menos NUP ou área, considera sucesso
      if (nup || areaHa || fase) {
        return NextResponse.json({
          ok: true,
          tentativa,
          nup: nup || null,
          areaHa: areaHa ? parseFloat(areaHa.replace(",", ".")) : null,
          substancias: substancias || null,
          municipios: municipios || null,
          fase: fase || null,
          tipoRequerimento: tipoReq || null,
          raw: { nup, areaHa, fase },
        });
      }
    } catch (e) {
      if (tentativa === 3) {
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro ao consultar Cadastro Mineiro", tentativa }, { status: 500 });
      }
    }
  }

  // fallback: retorna htmlPreview para preenchimento manual
  return NextResponse.json({
    ok: false,
    modo: "captcha_falhou",
    mensagem: "Não foi possível resolver o captcha automaticamente após 3 tentativas. Copie o NUP manualmente do Cadastro Mineiro ou tente novamente.",
    numero: `${num}/${ano}`,
    sugestaoNup: `48${num.slice(0, 3)}.${num.slice(3)}000/${ano}-00 (verifique no Cadastro Mineiro)`,
  }, { status: 422 });
}
