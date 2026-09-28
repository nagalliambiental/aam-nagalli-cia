import { prisma } from "@/lib/prisma";
import {
  buscarLegislacaoIat,
  buscarDataAtoPdf,
  extrairDataPublicacao,
  FONTE_LEGISLACAO_IAT,
} from "@/lib/legislacao-iat";

export type ResultadoSincronizacaoLegislacao = {
  lidas: number;
  novas: number;
  atualizadas: number;
  revogadas: number;
  semMudanca: number;
  dataAtoPreenchidas: number;
  dataAtoPendentes: number;
};

/** Limite de PDFs consultados por lote (para a rota manual não estourar o tempo). */
const LOTE_DATA_ATO = 10;
const MAX_TENTATIVAS_DATA_ATO = 5;
/** O site do IAT responde 404 intermitente sob rajada — espera entre downloads. */
const ESPERA_ENTRE_PDFS = 400;

/**
 * Preenche a data do ato (CreationDate/ModDate do PDF) das normas ainda sem ela.
 * Falha (inclusive 404 intermitente do site) conta tentativa; só marca como consultada
 * quando o arquivo é baixado com sucesso — sem data a tela usa o mês da pasta do PDF.
 */
export async function preencherDataAto(limite = LOTE_DATA_ATO): Promise<{ preenchidas: number; pendentes: number }> {
  const filtro = {
    url: { not: null as null },
    dataAtoConsultada: false,
    dataAtoTentativas: { lt: MAX_TENTATIVAS_DATA_ATO },
  };
  const lote = await prisma.legislacaoIat.findMany({
    where: filtro,
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
    take: limite,
    select: { id: true, url: true },
  });

  let preenchidas = 0;
  for (const [indice, norma] of lote.entries()) {
    if (!norma.url) continue;
    if (indice > 0) await new Promise((r) => setTimeout(r, ESPERA_ENTRE_PDFS));
    try {
      const dataAto = await buscarDataAtoPdf(norma.url);
      await prisma.legislacaoIat.update({
        where: { id: norma.id },
        data: { dataAto, dataAtoConsultada: true, dataAtoTentativas: 0 },
      });
      preenchidas++;
    } catch {
      await prisma.legislacaoIat.update({
        where: { id: norma.id },
        data: { dataAtoTentativas: { increment: 1 } },
      });
    }
  }

  const pendentes = await prisma.legislacaoIat.count({ where: filtro });
  return { preenchidas, pendentes };
}

function resumir(texto: string, limite = 140): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

async function notificarLegislacao(mensagem: string, url: string | null): Promise<void> {
  const ja = await prisma.notificacao.findFirst({
    where: { tipo: "legislacao_iat", mensagem, lida: false },
  });
  if (ja) return;
  await prisma.notificacao.create({
    data: { tipo: "legislacao_iat", mensagem, url, destinatarioUsuarioId: null },
  });
}

/**
 * Sincroniza as Instruções Normativas / Orientações Técnicas do IAT com o banco.
 * - norma inédita no site → cria registro + notificação "nova norma";
 * - norma vigente que passa a constar como revogada → atualiza + notificação "revogada";
 * - qualquer outra alteração de texto/link → atualiza sem notificar.
 */
export async function sincronizarLegislacaoIat(): Promise<ResultadoSincronizacaoLegislacao> {
  const itens = await buscarLegislacaoIat();
  const existentes = await prisma.legislacaoIat.findMany();
  // Primeira carga (tabela vazia): importa tudo sem gerar notificações em massa.
  const primeiraCarga = existentes.length === 0;
  const mapa = new Map(existentes.map((e) => [`${e.tipo}-${e.numero}-${e.ano}`, e]));
  const agora = new Date();

  const resultado: ResultadoSincronizacaoLegislacao = {
    lidas: itens.length,
    novas: 0,
    atualizadas: 0,
    revogadas: 0,
    semMudanca: 0,
    dataAtoPreenchidas: 0,
    dataAtoPendentes: 0,
  };

  for (const item of itens) {
    const chave = `${item.tipo}-${item.numero}-${item.ano}`;
    const atual = mapa.get(chave);
    const dados = {
      tipo: item.tipo,
      numero: item.numero,
      ano: item.ano,
      titulo: item.titulo,
      ementa: item.ementa,
      url: item.url,
      anexosUrl: item.anexosUrl,
      situacao: item.situacao,
      revogadaPor: item.revogadaPor,
      hash: item.hash,
      fonteUrl: FONTE_LEGISLACAO_IAT,
      dataPublicacao: extrairDataPublicacao(item.url),
      ultimaVerificacao: agora,
    };

    if (!atual) {
      await prisma.legislacaoIat.create({ data: dados });
      resultado.novas++;
      if (!primeiraCarga) {
        await notificarLegislacao(
          `Nova norma do IAT: ${item.titulo} — ${resumir(item.ementa)}`,
          item.url ?? FONTE_LEGISLACAO_IAT,
        );
      }
      continue;
    }

    if (atual.hash === item.hash) {
      const dataPublicacao = extrairDataPublicacao(item.url);
      if (atual.dataPublicacao !== dataPublicacao || atual.ultimaVerificacao.getTime() !== agora.getTime()) {
        await prisma.legislacaoIat.update({
          where: { id: atual.id },
          data: { dataPublicacao, ultimaVerificacao: agora },
        });
      }
      resultado.semMudanca++;
      continue;
    }

    const virouRevogada = atual.situacao !== "revogada" && item.situacao === "revogada";
    await prisma.legislacaoIat.update({ where: { id: atual.id }, data: dados });
    resultado.atualizadas++;

    if (virouRevogada) {
      resultado.revogadas++;
      await notificarLegislacao(
        `${item.titulo} foi revogada${item.revogadaPor ? ` pela ${item.revogadaPor}` : ""}.`,
        item.url ?? FONTE_LEGISLACAO_IAT,
      );
    }
  }

  const dataAto = await preencherDataAto();
  resultado.dataAtoPreenchidas = dataAto.preenchidas;
  resultado.dataAtoPendentes = dataAto.pendentes;

  return resultado;
}
