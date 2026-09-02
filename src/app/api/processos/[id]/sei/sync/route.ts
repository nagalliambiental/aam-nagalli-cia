import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consultarPaginaSei, extrairUrlsExibirSei, nupConfere, type AndamentoSei } from "@/lib/sei";

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

/**
 * Fallback: parse do HTML de RESULTADO da pesquisa SEI (sem hora/unidade).
 * Usado apenas quando a URL de exibição do processo não pôde ser consultada.
 */
function parseAndamentos(htmlHtml: string): AndamentoSei[] {
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

  const andamentos: AndamentoSei[] = [];
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
    const dm = seg.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    const data = dm ? `${dm[1].split("/")[0].padStart(2, "0")}/${dm[1].split("/")[1].padStart(2, "0")}/${dm[1].split("/")[2]}` : rows[i].data;
    const descricao = seg
      .replace(dm ? dm[1] : "__NÃO__", " ")
      .replace(/\bUnidade[^]*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (descricao.length >= 8) andamentos.push({ data, descricao, hora: "", unidade: "" });
  }
  return andamentos.slice(0, 20);
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

  const ok = (andamentos: AndamentoSei[]) =>
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
  // Valida se a página é mesmo do processo procurado; senão, cai para recapturar.
  if (seiTokenUrl && !codigoManual) {
    const { andamentos, nup } = await consultarPaginaSei(seiTokenUrl).catch(() => ({ andamentos: [], nup: null }));
    if (nupConfere(chave, nup) && andamentos.length > 0) return ok(andamentos);
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
    // Testa os vários processos relacionados e usa o primeiro cuja página
    // confirme o NUP procurado (o SEI retorna vários por pesquisa). Se nenhum
    // confirmar, usa o primeiro que tenha andamentos reais (fallback).
    const urls = extrairUrlsExibirSei(json.html ?? "");
    let fallback: { url: string; andamentos: AndamentoSei[] } | null = null;
    for (const url of urls) {
      const { andamentos, nup } = await consultarPaginaSei(url).catch(() => ({ andamentos: [], nup: null }));
      if (andamentos.length === 0) continue;
      if (nupConfere(chave, nup)) {
        await prisma.processo.update({ where: { id: processoId }, data: { seiUrl: url } }).catch(() => {});
        return ok(andamentos);
      }
      if (!fallback) fallback = { url, andamentos };
    }
    if (fallback) {
      await prisma.processo.update({ where: { id: processoId }, data: { seiUrl: fallback.url } }).catch(() => {});
      return ok(fallback.andamentos);
    }

    // Não usamos o parse da busca (datas incorretas) — melhor informar do que mostrar errado.
    return NextResponse.json(
      { ok: false, modo: "sem_resultados", mensagem: "Processo encontrado, mas não foi possível ler os andamentos. Tente novamente em instantes.", chave },
      { status: 422 }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro ao consultar o SEI" }, { status: 500 });
  }
}
