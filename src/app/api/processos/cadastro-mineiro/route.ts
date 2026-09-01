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

// Normaliza a fase do SIGMINE para os valores padronizados do sistema
function normalizarFase(fase: string): string {
  const f = fase.toLowerCase();
  const mapeia: [RegExp, string][] = [
    [/\brequerimento.*pesquisa\b/, "Requerimento de Pesquisa"],
    [/\bautoriza.+\b.*\bpesquisa\b|\bpesquisa\b/, "Autorização de Pesquisa"],
    [/direito de requerer a lavra/, "Direito de Requerer a Lavra"],
    [/\brequerimento.*lavra\b/, "Requerimento de Lavra"],
    [/\bconcess.+\b.*\blavra\b|\blavra\b/, "Concessão de Lavra"],
  ];
  for (const [re, valor] of mapeia) {
    if (re.test(f)) return valor;
  }
  return fase.trim();
}

// Consulta os dados abertos do SIGMINE (ArcGIS FeatureServer) - sem captcha, rápido
async function consultaSigmine(num: string, ano: string): Promise<{
  areaHa: number | null;
  fase: string | null;
  substancias: string | null;
  titular: string | null;
  uf: string | null;
  uso: string | null;
  ultEvento: string | null;
  processoAnm: string | null;
} | null> {
  try {
    const url = "https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/FeatureServer/0/query";
    const params = new URLSearchParams({
      where: `NUMERO=${num} AND ANO=${ano}`,
      outFields: "PROCESSO,NUMERO,ANO,FASE,NOME,SUBS,USO,AREA_HA,UF,ULT_EVENTO",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "5",
    });
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${url}?${params}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const feats = (data as { features?: { attributes?: Record<string, unknown> }[] }).features;
    if (!feats?.length) return null;
    const a = feats[0].attributes ?? {};
    return {
      areaHa: a.AREA_HA != null ? Number(a.AREA_HA) : null,
      fase: a.FASE ? normalizarFase(String(a.FASE)) : null,
      substancias: a.SUBS ? String(a.SUBS) : null,
      titular: a.NOME ? String(a.NOME) : null,
      uf: a.UF ? String(a.UF) : null,
      uso: a.USO ? String(a.USO) : null,
      ultEvento: a.ULT_EVENTO ? String(a.ULT_EVENTO) : null,
      processoAnm: a.PROCESSO ? String(a.PROCESSO) : null,
    };
  } catch {
    return null;
  }
}

// Busca a página do Cadastro Mineiro e retorna captcha + sessão para preenchimento manual no popup
async function getPopupData(numCompleto: string): Promise<{
  captchaUrl: string;
  viewState: string;
  viewStateGen: string;
  eventValidation: string;
  cookies: string;
} | null> {
  try {
    const base = "https://sistemas.anm.gov.br";
    const url = `${base}/SCM/extra/site/admin/dadosProcesso.aspx`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const getRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal, cache: "no-store" });
    clearTimeout(t);
    const cookies = getRes.headers.get("set-cookie") ?? "";
    const html = await getRes.text();
    const vs = extractInput(html, "__VIEWSTATE");
    const vsg = extractInput(html, "__VIEWSTATEGENERATOR");
    const ev = extractInput(html, "__EVENTVALIDATION");
    const guid = extractCaptchaGuid(html);
    if (!guid) return null;
    return {
      captchaUrl: `${base}/SCM/extra/CaptchaImage.aspx?guid=${guid}`,
      viewState: vs,
      viewStateGen: vsg,
      eventValidation: ev,
      cookies,
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const numeroRaw = (body.numero as string ?? "").trim();
  const codigoManual = (body.codigo as string ?? "").trim();
  // Estado retornado pelo passo do popup para reutilizar a mesma sessão na consulta
  const cookies = (body.cookies as string ?? "").trim();
  const viewStateIn = (body.viewState as string ?? "").trim();
  const viewStateGenIn = (body.viewStateGen as string ?? "").trim();
  const eventValidationIn = (body.eventValidation as string ?? "").trim();
  if (!numeroRaw) return NextResponse.json({ error: "Número do processo obrigatório (ex: 866.123/2024)" }, { status: 400 });

  // normaliza numero: mantém formato com ponto para o Cadastro Mineiro (ex: 815.310/2008)
  const m = numeroRaw.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m) {
    return NextResponse.json({ error: "Formato inválido. Use 000.000/0000" }, { status: 400 });
  }
  const numCompleto = `${m[1]}.${m[2]}/${m[3]}`;
  const num = m[1] + m[2];
  const ano = m[3];

  const urlCm = "https://sistemas.anm.gov.br/SCM/extra/site/admin/dadosProcesso.aspx";

  // Se veio código manual, usa a MESMA sessão do popup (cookies/estado recebidos) para o POST
  if (codigoManual) {
    try {
      if (!cookies || !viewStateIn) {
        return NextResponse.json({ error: "Sessão expirada. Clique em Buscar CM novamente." }, { status: 422 });
      }
      const form = new URLSearchParams({
        __VIEWSTATE: viewStateIn,
        __VIEWSTATEGENERATOR: viewStateGenIn,
        __EVENTVALIDATION: eventValidationIn,
        "ctl00$conteudo$txtNumeroProcesso": numCompleto,
        "ctl00$conteudo$CaptchaControl1": codigoManual,
        "ctl00$conteudo$btnConsultarProcesso": "Consultar",
      });
      const postRes = await fetch(urlCm, {
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

  // Fonte primária (automática, sem captcha): dados abertos do SIGMINE (ArcGIS)
  // Em paralelo, busca captcha do Cadastro Mineiro como fallback
  const [sig, pop] = await Promise.all([consultaSigmine(num, ano), getPopupData(numCompleto)]);

  if (sig && (sig.areaHa != null || sig.fase || sig.processoAnm)) {
    return NextResponse.json({
      ok: true,
      modo: "sigmine",
      numero: numCompleto,
      processoSigmine: sig.processoAnm,
      areaHa: sig.areaHa,
      fase: sig.fase,
      substancias: sig.substancias,
      titular: sig.titular,
      uf: sig.uf,
      uso: sig.uso,
      ultEvento: sig.ultEvento,
      mensagem: "Dados obtidos automaticamente do SIGMINE (dados abertos ANM).",
    });
  }

  if (pop) {
    return NextResponse.json({
      ok: false,
      modo: "captcha_popup",
      mensagem: "SIGMINE não retornou o processo. Digite o código da imagem para buscar no Cadastro Mineiro.",
      numero: numCompleto,
      captchaUrl: pop.captchaUrl,
      viewState: pop.viewState,
      viewStateGen: pop.viewStateGen,
      eventValidation: pop.eventValidation,
      cookies: pop.cookies,
    }, { status: 422 });
  }

  return NextResponse.json({
    ok: false,
    modo: "manual_fallback",
    mensagem: "Não foi possível consultar a ANM automaticamente. Preencha NUP, área e fase manualmente e salve.",
    numero: numCompleto,
  }, { status: 200 });
}