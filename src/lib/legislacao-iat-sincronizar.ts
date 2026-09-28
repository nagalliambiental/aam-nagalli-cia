import { prisma } from "@/lib/prisma";
import { buscarLegislacaoIat, FONTE_LEGISLACAO_IAT } from "@/lib/legislacao-iat";

export type ResultadoSincronizacaoLegislacao = {
  lidas: number;
  novas: number;
  atualizadas: number;
  revogadas: number;
  semMudanca: number;
};

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
      if (atual.ultimaVerificacao.getTime() !== agora.getTime()) {
        await prisma.legislacaoIat.update({ where: { id: atual.id }, data: { ultimaVerificacao: agora } });
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

  return resultado;
}
