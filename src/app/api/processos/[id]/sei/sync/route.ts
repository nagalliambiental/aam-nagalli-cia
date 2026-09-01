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
 * Abordagem à prova de markup: remove as tags, localiza cada data dd/mm/aaaa e
 * toma como descrição o texto compreendido até a próxima data (ou fim).
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
  const re = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
  const matches: { index: number; data: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const [d, mo, y] = m[1].split("/");
    matches.push({ index: m.index, data: `${d.padStart(2, "0")}/${mo.padStart(2, "0")}/${y}` });
  }
  for (let i = 0; i < matches.length; i++) {
    const inicio = matches[i].index + matches[i].data.length;
    const fim = i + 1 < matches.length ? matches[i + 1].index : texto.length;
    const descricao = texto.slice(inicio, fim).trim().replace(/\s+/g, " ");
    if (descricao.length >= 8) andamentos.push({ data: matches[i].data, descricao });
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

  // 1) Sem código: retorna captcha para digitação manual (fluxo do SeiSyncPanel)
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

  // 2) Com código: pesquisa real no SEI (endpoint AJAX) e parse das movimentações.
  // Obs.: a pesquisa pública do SEI é stateless (não usa cookie) — depende só do hdnCId.
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
    } catch {
      // não-JSON: resposta inesperada
    }
    const itens = json.itens ?? 0;

    if (/c[oó]digo de confirma[cç][aã]o inv[aá]lido|inv[aá]lido/i.test(raw)) {
      return NextResponse.json({ ok: false, error: "Código incorreto. Tente novamente." }, { status: 422 });
    }
    if (itens === 0) {
      return NextResponse.json({ ok: false, modo: "sem_resultados", mensagem: `Nenhum processo encontrado no SEI para ${chave}.`, chave });
    }

    const andamentos = parseAndamentos(json.html ?? "");
    if (andamentos.length === 0) {
      return NextResponse.json({ ok: true, andamentos, criados: 0, chave, mensagem: "Processo encontrado, mas sem movimentações legíveis." });
    }

    // Dedup por (data + descrição) e criação de Eventos + Notificacao
    const tipoEvento = await prisma.tipoEvento.findFirst({ where: { ativo: true } });
    let criados = 0;
    const novos: Andamento[] = [];
    for (const a of andamentos) {
      const [d, mo, y] = a.data.split("/").map(Number);
      const data = new Date(y, mo - 1, d);
      const jaExiste = await prisma.evento.findFirst({
        where: {
          processoId,
          descricao: a.descricao,
          data: { gte: new Date(data.getTime() - 1000), lte: new Date(data.getTime() + 1000) },
        },
      });
      if (jaExiste) continue;
      if (!tipoEvento) continue;
      await prisma.evento.create({ data: { processoId, tipoEventoId: tipoEvento.id, descricao: a.descricao, data } });
      await prisma.notificacao.create({
        data: {
          tipo: "sei_movimentacao",
          mensagem: `Nova movimentação no SEI (${processo.numero}): ${a.descricao}`,
          processoId,
          destinatarioUsuarioId: Number(session.user.id),
        },
      });
      criados++;
      novos.push(a);
    }

    return NextResponse.json({ ok: true, andamentos: novos, criados, chave });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro ao consultar o SEI" }, { status: 500 });
  }
}
