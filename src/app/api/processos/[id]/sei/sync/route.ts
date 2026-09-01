import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const BASE_SEI = "https://sei.anm.gov.br";
const URL_PESQUISA = `${BASE_SEI}/sei/modulos/pesquisa/md_pesq_processo_pesquisar.php?acao_externa=protocolo_pesquisar&acao_origem_externa=protocolo_pesquisa&id_orgao_acesso_externo=0`;
const URL_AJAX = `${BASE_SEI}/sei/modulos/pesquisa/md_pesq_controlador_ajax_externo.php?acao_ajax_externo=protocolo_pesquisar&id_orgao_acesso_externo=0`;

/** Extrai o captcha em base64 (data:image/png) da página de pesquisa do SEI. */
function extrairCaptchaSei(html: string): string | null {
  const m =
    html.match(/id="imgCaptcha"\s+src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/i) ||
    html.match(/src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/i);
  return m ? `data:image/png;base64,${m[1]}` : null;
}

function extrairCID(html: string): string {
  return html.match(/name="hdnCId"[^>]*value="([^"]*)"/i)?.[1] ?? "";
}

/** Monta o POST do controlador AJAX de pesquisa do SEI (campos obrigatórios). */
function montarFormSei(chave: string, codigo: string, cid: string): URLSearchParams {
  return new URLSearchParams({
    txtProtocoloPesquisa: chave,
    q: "",
    chkSinProcessos: "P",
    chkSinDocumentosGerados: "",
    chkSinDocumentosRecebidos: "",
    txtParticipante: "",
    hdnIdParticipante: "",
    txtUnidade: "",
    hdnIdUnidade: "",
    txtDataInicio: "",
    txtDataFim: "",
    txtInfraCaptcha: codigo,
    hdnInfraCaptcha: "1",
    txtNumeroDocumentoPesquisa: "",
    txtAssinante: "",
    hdnIdAssinante: "",
    txtDescricaoPesquisa: "",
    txtAssunto: "",
    hdnIdAssunto: "",
    txtSiglaUsuario1: "",
    txtSiglaUsuario2: "",
    txtSiglaUsuario3: "",
    txtSiglaUsuario4: "",
    hdnSiglasUsuarios: "",
    hdnCId: cid,
    partialfields: "",
    requiredfields: "",
    as_q: "",
    hdnFlagPesquisa: "1",
  });
}

type Andamento = { data: string; descricao: string };

/**
 * Converte o HTML de resultado da pesquisa SEI em andamentos (data + descrição).
 * Cada linha de andamento encerra com o rótulo "Data: dd/mm/yyyy" (data da
 * consulta). A data REAL da movimentação aparece DENTRO da descrição (antes de
 * "Unidade:") — é essa que usamos como data do evento.
 */
function parseAndamentos(htmlHtml: string): Andamento[] {
  const texto = htmlHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/\s+/g, " ");

  const andamentos: Andamento[] = [];
  // Partições: cada "Data: dd/mm/aaaa" acompanha um andamento (Rótulo da linha).
  const reRow = /\bData:\s*(\d{1,2}\/\d{1,2}\/\d{4})\b/g;
  const rows: { start: number; end: number; data: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = reRow.exec(texto)) !== null) {
    const [d, mo, y] = m[1].split("/");
    rows.push({ start: m.index, end: m.index + m[0].length, data: `${d.padStart(2, "0")}/${mo.padStart(2, "0")}/${y}` });
  }
  if (rows.length === 0) return andamentos;

  for (let i = 0; i < rows.length; i++) {
    const inicio = i > 0 ? rows[i - 1].end : 0;
    const fim = rows[i].start;
    const seg = texto.slice(inicio, fim).trim();
    if (seg.length < 8) continue;
    // Prefere a data DENTRO da descrição; senão usa a data do rótulo "Data:" da linha.
    const dm = seg.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    const data = dm ? `${dm[1].split("/")[0].padStart(2, "0")}/${dm[1].split("/")[1].padStart(2, "0")}/${dm[1].split("/")[2]}` : rows[i].data;
    const descricao = seg
      .replace(dm ? dm[1] : "__NÃO__", " ")
      .replace(/\bUnidade[^]*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (descricao.length >= 8) andamentos.push({ data, descricao });
  }
  return andamentos.slice(0, 20);
}

function limparHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parseia a página de exibição do processo (md_pesq_processo_exibir.php?token).
 * Cada linha <tr class="andamento..."> tem: data/hora, unidade e descrição.
 */
function parseAndamentosProcesso(htmlHtml: string): Andamento[] {
  const rows = htmlHtml.match(/<tr[^>]*class="[^"]*andamento[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const out: Andamento[] = [];
  for (const row of rows) {
    const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
    if (tds.length < 3) continue;
    const dataHora = limparHtml(tds[0] ?? "");
    const dm = dataHora.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!dm) continue;
    const data = `${dm[1].padStart(2, "0")}/${dm[2].padStart(2, "0")}/${dm[3]}`;
    const descricao = limparHtml(tds[2] ?? "");
    if (descricao.length >= 4) out.push({ data, descricao });
  }
  return out.slice(0, 30);
}

/** Extrai a URL de exibição (md_pesq_processo_exibir.php?token) do HTML de resultado. */
function extrairUrlExibirSei(htmlSearch: string): string | null {
  const m = htmlSearch.match(/md_pesq_processo_exibir\.php\?[A-Za-z0-9_-]{20,}/);
  return m ? `${BASE_SEI}/sei/modulos/pesquisa/${m[0]}` : null;
}

/** Busca a página de exibição do processo e retorna os andamentos (datas reais). */
async function fetchAndamentosPorToken(url: string): Promise<Andamento[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  return parseAndamentosProcesso(html);
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const chave = processo.nup ?? processo.numero;
  if (!chave) return NextResponse.json({ error: "Processo sem NUP ou número" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const codigoManual = (body.codigo as string ?? "").trim();
  const cookiesIn = (body.cookies as string ?? "").trim();
  const cidIn = (body.cid as string ?? "").trim();

  // Se já temos a URL de exibição (token), consultamos direto — SEM captcha.
  const seiUrlRaw = processo.seiUrl ?? "";
  const seiTokenUrl = seiUrlRaw.includes("md_pesq_processo_exibir") ? seiUrlRaw : null;

  const ok = (andamentos: Andamento[]) =>
    NextResponse.json({
      ok: true,
      andamentos,
      criados: 0,
      chave,
      mensagem: andamentos.length === 0
        ? "Nenhum andamento encontrado."
        : `${andamentos.length} ${andamentos.length === 1 ? "movimentação" : "movimentações"} no SEI.`,
    });

  // (A) Direto pelo token (sem captcha), quando não estamos confirmando um código.
  if (seiTokenUrl && !codigoManual) {
    const andamentos = await fetchAndamentosPorToken(seiTokenUrl).catch(() => []);
    if (andamentos.length > 0) return ok(andamentos);
  }

  // (B) Sem código e sem token: retorna captcha para digitação manual.
  if (!codigoManual) {
    try {
      const res = await fetch(URL_PESQUISA, { headers: { "User-Agent": UA }, cache: "no-store" });
      const cookies = res.headers.get("set-cookie") ?? "";
      const html = await res.text();
      const captchaBase64 = extrairCaptchaSei(html);
      const cid = extrairCID(html);
      if (captchaBase64) {
        return NextResponse.json(
          { ok: false, modo: "captcha_manual", mensagem: "Digite o código da imagem para ver as movimentações.", chave, captchaBase64, cookies, cid },
          { status: 422 }
        );
      }
    } catch {}
    return NextResponse.json(
      { ok: false, modo: "captcha_falhou", mensagem: "Não foi possível carregar o captcha do SEI. Tente novamente.", chave },
      { status: 422 }
    );
  }

  // (C) Com código: pesquisa no SEI (AJAX) → extrai URL do processo → consulta direto.
  if (!cidIn) {
    return NextResponse.json({ ok: false, error: "Sessão expirada. Clique em Verificar movimentação novamente." }, { status: 422 });
  }
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": UA,
      Referer: URL_PESQUISA,
      Origin: BASE_SEI,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "*/*",
    };
    if (cookiesIn) headers.Cookie = cookiesIn;

    const post = await fetch(URL_AJAX, {
      method: "POST",
      headers,
      body: montarFormSei(chave, codigoManual, cidIn).toString(),
      cache: "no-store",
    });
    const raw = await post.text();
    let json: { html?: string; itens?: number } = {};
    try {
      json = JSON.parse(raw);
    } catch {}

    if (/c[oó]digo de confirma[cç][aã]o inv[aá]lido|inv[aá]lido/i.test(raw)) {
      return NextResponse.json({ ok: false, error: "Código incorreto. Tente novamente." }, { status: 422 });
    }
    if ((json.itens ?? 0) === 0) {
      return NextResponse.json({ ok: false, modo: "sem_resultados", mensagem: `Nenhum processo encontrado no SEI para ${chave}.`, chave });
    }

    // Extrai a URL de exibição (token) do resultado e guarda no processo.
    const tokenUrl = extrairUrlExibirSei(json.html ?? "");
    if (tokenUrl) {
      await prisma.processo.update({ where: { id: processoId }, data: { seiUrl: tokenUrl } }).catch(() => {});
      const andamentos = await fetchAndamentosPorToken(tokenUrl).catch(() => []);
      if (andamentos.length > 0) return ok(andamentos);
    }

    // Fallback: parse direto da pesquisa (sem datas por andamento).
    const andamentos = parseAndamentos(json.html ?? "");
    if (andamentos.length === 0) {
      return NextResponse.json({ ok: true, andamentos, criados: 0, chave, mensagem: "Processo encontrado, mas sem movimentações legíveis." });
    }
    return ok(andamentos);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro ao consultar o SEI" }, { status: 500 });
  }
}
