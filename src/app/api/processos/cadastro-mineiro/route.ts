import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const BASE = "https://sistemas.anm.gov.br";
const URL_CM = `${BASE}/SCM/extra/site/admin/dadosProcesso.aspx`;

// Solver externo (Hugging Face Spaces + ddddocr). Se configurado, o fluxo de ANM
// passa por ele (resolve o bloqueio de IP e o captcha fora do Vercel). Sem ele,
// mantém o fluxo local (funciona na sua máquina, que alcança a ANM).
const SOLVER_URL = (process.env.ANM_SOLVER_URL ?? "").replace(/\/+$/, "");
const SOLVER_TOKEN = process.env.ANM_SOLVER_TOKEN ?? "";

function extractInput(html: string, name: string): string {
  const re = new RegExp(`name="${name.replace(/\$/g, "\\$")}"[^>]*value="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1] : "";
}

function extractCaptchaGuid(html: string): string | null {
  const m = html.match(/CaptchaImage\.aspx\?guid=([a-f0-9-]+)/i);
  return m ? m[1] : null;
}

/** Extrai o campo "Acesso SEI:" que acompanha o resultado do Cadastro Mineiro. */
function extractSeiUrl(html: string): string | null {
  // padrão típico da resposta: <a id=... href='https://sei.anm.gov.br/sei/...'>Clique aqui</a>
  const re = /href=["'](https:\/\/sei\.anm\.gov\.br\/sei\/[^"']+)["']/i;
  const m = html.match(re);
  if (m) return m[1];
  // fallback: link relativo
  const re2 = /href=["'](\/sei\/[^"']+)["']/i;
  const m2 = html.match(re2);
  if (m2) return `https://sei.anm.gov.br${m2[1]}`;
  return null;
}

const LABELS_CM = [
  "NUP", "Acesso SEI", "Área (ha)", "Tipo de requerimento", "Fase atual", "Ativo",
  "Superintendência", "UF", "Unidade protocolizadora", "Data Protocolo", "Data Prioridade",
  "Pessoas relacionadas", "Número do processo de Cadastro da Empresa", "Títulos",
  "Substâncias", "Municípios", "Condição de propriedade do solo", "Processos associados",
  "Documentos que compõem o processo", "Eventos",
];

function textoPlano(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Converte a resposta do SCM em um mapa label -> valor (pares da tabela). */
function parseParesCM(html: string): Record<string, string> {
  const texto = textoPlano(html);
  const labelAlt = LABELS_CM.map((l) => l.replace(/\s+/g, "\\s+").replace(/\(/g, "\\(").replace(/\)/g, "\\)")).join("|");
  // Nota: \b no JS é ASCII-only e "Área" começa com Á (não-\w), então usamos
  // fronteira por espaço/início (equivalente em Python e JS).
  const re = new RegExp(
    `(?:^|\\s)(${labelAlt})\\s*:\\s*([\\s\\S]*?)(?=\\s+(?:${labelAlt})\\s*:|$)`,
    "gi"
  );
  const mapa: Record<string, string> = {};
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(texto)) !== null) {
    const key = mm[1].trim().toLowerCase();
    const valor = mm[2].trim().replace(/\s+/g, " ");
    if (key && valor) mapa[key] = valor;
  }
  return mapa;
}

/** Extrai um valor pelo label (com tolerância a espaços/acentos). */
function extrairValor(html: string, label: string): string {
  const mapa = parseParesCM(html);
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const alvo = norm(label);
  for (const k of Object.keys(mapa)) {
    if (norm(k) === alvo) {
      const v = mapa[k];
      return v.replace(/https?:\/\/\S+/g, "").replace(/Clique aqui/i, "").trim();
    }
  }
  return "";
}

/** Traz página + cookies + guid do captcha do Cadastro Mineiro. */
async function prepararSessaoCM() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(URL_CM, { headers: { "User-Agent": UA }, signal: controller.signal, cache: "no-store" });
    const cookies = res.headers.get("set-cookie") ?? "";
    const html = await res.text();
    const guid = extractCaptchaGuid(html);
    return {
      cookies,
      viewState: extractInput(html, "__VIEWSTATE"),
      viewStateGen: extractInput(html, "__VIEWSTATEGENERATOR"),
      eventValidation: extractInput(html, "__EVENTVALIDATION"),
      guid,
    };
  } finally {
    clearTimeout(t);
  }
}

async function consultarComCaptcha(numCompleto: string, codigo: string, cookies: string, viewState: string, viewStateGen: string, eventValidation: string): Promise<string> {
  const form = new URLSearchParams({
    __EVENTTARGET: "",
    __EVENTARGUMENT: "",
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGen,
    __VIEWSTATEENCRYPTED: "",
    __EVENTVALIDATION: eventValidation,
    "ctl00$conteudo$txtNumeroProcesso": numCompleto,
    "ctl00$conteudo$CaptchaControl1": codigo,
    "ctl00$conteudo$btnConsultarProcesso": "Consultar",
  });
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(URL_CM, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookies,
        "User-Agent": UA,
        Referer: URL_CM,
        Origin: "https://sistemas.anm.gov.br",
      },
      body: form.toString(),
      signal: controller.signal,
    });
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** Interpreta a resposta do SCM e devolve os dados estruturados. */
function parseRespostaCM(postHtml: string, numCompleto: string) {
  const areaTxt = extrairValor(postHtml, "Área (ha)");
  const areaMm = areaTxt.match(/[\d.,]+/);
  const dados = {
    numero: numCompleto,
    nup: extrairValor(postHtml, "NUP") || null,
    areaHa: areaMm ? parseFloat(areaMm[0].replace(/\.(?=\d{3})/g, "").replace(",", ".")) : null,
    fase: extrairValor(postHtml, "Fase atual") || null,
    substancias: extrairValor(postHtml, "Substâncias") || null,
    municipios: extrairValor(postHtml, "Municípios") || null,
    tipoRequerimento: extrairValor(postHtml, "Tipo de requerimento") || null,
    ativo: extrairValor(postHtml, "Ativo") || null,
    superintendencia: extrairValor(postHtml, "Superintendência") || null,
    uf: extrairValor(postHtml, "UF") || null,
    seiUrl: extractSeiUrl(postHtml),
  };
  const temDados = dados.nup || dados.areaHa != null || dados.fase || dados.seiUrl;
  return temDados ? dados : null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const numeroRaw = (body.numero as string ?? "").trim();
  const codigoManual = (body.codigo as string ?? "").trim();
  const cookiesIn = (body.cookies as string ?? "").trim();
  const viewStateIn = (body.viewState as string ?? "").trim();
  const viewStateGenIn = (body.viewStateGen as string ?? "").trim();
  const eventValidationIn = (body.eventValidation as string ?? "").trim();
  if (!numeroRaw) return NextResponse.json({ error: "Número do processo obrigatório (ex: 866.123/2024)" }, { status: 400 });

  const m = numeroRaw.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m) return NextResponse.json({ error: "Formato inválido. Use 000.000/0000" }, { status: 400 });
  const numCompleto = `${m[1]}.${m[2]}/${m[3]}`;

  // 0) Se houver solver externo configurado (Hugging Face), delega a consulta.
  if (SOLVER_URL) {
    const controlador = new AbortController();
    const t = setTimeout(() => controlador.abort(), 60000);
    try {
      const res = await fetch(`${SOLVER_URL}/anm/cm/consultar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SOLVER_TOKEN ? { "X-Solver-Token": SOLVER_TOKEN } : {}),
        },
        body: JSON.stringify({
          numero: numCompleto,
          codigo: codigoManual || undefined,
          cookies: cookiesIn || undefined,
          viewState: viewStateIn || undefined,
          viewStateGen: viewStateGenIn || undefined,
          eventValidation: eventValidationIn || undefined,
        }),
        cache: "no-store",
        signal: controlador.signal,
      });
      const d = await res.json().catch(() => null);
      if (d && typeof d === "object") return NextResponse.json(d, { status: res.status });
    } catch {
      // solver indisponível => segue para o fluxo local
    } finally {
      clearTimeout(t);
    }
  }

  // 1) Código manual informado (popup) => usar mesma sessão
  if (codigoManual) {
    try {
      if (!cookiesIn || !viewStateIn) return NextResponse.json({ error: "Sessão expirada. Clique em Buscar CM novamente." }, { status: 422 });
      const postHtml = await consultarComCaptcha(numCompleto, codigoManual, cookiesIn, viewStateIn, viewStateGenIn, eventValidationIn);
      if (/Validation of viewstate MAC failed/i.test(postHtml)) {
        return NextResponse.json({ ok: false, error: "Sessão expirada ou bloqueada pela ANM. Clique em Buscar CM novamente." }, { status: 422 });
      }
      if (/CaptchaImage\.aspx/.test(postHtml) && /Informe o c[óo]digo|Informe o código/i.test(postHtml)) {
        return NextResponse.json({ ok: false, error: "Código incorreto. Tente novamente." }, { status: 422 });
      }
      const d = parseRespostaCM(postHtml, numCompleto);
      if (d) return NextResponse.json({ ok: true, modo: "cm", ...d, mensagem: "Dados do Cadastro Mineiro." });
      return NextResponse.json({ ok: false, error: "Processo não encontrado ou sem dados." }, { status: 404 });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro ao consultar Cadastro Mineiro" }, { status: 500 });
    }
  }

  // 2) Fluxo gratuito: abre popup com captcha; navegador resolve via OCR (Tesseract.js) ou digitação
  const sessao = await prepararSessaoCM();
  if (!sessao?.guid) {
    return NextResponse.json({ ok: false, modo: "manual_fallback", mensagem: "Não foi possível acessar o Cadastro Mineiro. Preencha os dados manualmente.", numero: numCompleto }, { status: 200 });
  }

  // Busca a imagem do captcha
  let capBuf: Buffer | null = null;
  try {
    const capRes = await fetch(`${BASE}/SCM/extra/CaptchaImage.aspx?guid=${sessao.guid}`, { headers: { Cookie: sessao.cookies, "User-Agent": UA }, cache: "no-store" });
    capBuf = Buffer.from(await capRes.arrayBuffer());
  } catch {}

  if (capBuf) {
    const base64 = `data:image/jpeg;base64,${capBuf.toString("base64")}`;
    return NextResponse.json({
      ok: false,
      modo: "captcha_manual",
      mensagem: "Resolva o captcha abaixo (OCR automático ou digitação).",
      numero: numCompleto,
      captchaBase64: base64,
      viewState: sessao.viewState,
      viewStateGen: sessao.viewStateGen,
      eventValidation: sessao.eventValidation,
      cookies: sessao.cookies,
    }, { status: 422 });
  }

  return NextResponse.json({ ok: false, modo: "manual_fallback", mensagem: "Não foi possível carregar o captcha. Preencha os dados manualmente.", numero: numCompleto }, { status: 200 });
}