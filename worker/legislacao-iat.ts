// Worker da Legislação IAT (Instituto Água e Terra).
// Baixa a página de Instruções Normativas / Orientações Técnicas, grava as normas
// no Neon e notifica novidades (norma nova ou revogação).
// Uso: npx tsx worker/legislacao-iat.ts  (com DATABASE_URL no ambiente)
import { prisma } from "../src/lib/prisma";
import { sincronizarLegislacaoIat, preencherDataAto } from "../src/lib/legislacao-iat-sincronizar";

async function main() {
  const r = await sincronizarLegislacaoIat();
  let preenchidas = r.dataAtoPreenchidas;
  let pendentes = r.dataAtoPendentes;
  let lotes = 1;
  // Backfill da data do ato (PDF): continua até zerar as pendências.
  while (pendentes > 0 && preenchidas > 0 && lotes < 60) {
    const lote = await preencherDataAto(30);
    preenchidas += lote.preenchidas;
    pendentes = lote.pendentes;
    lotes++;
  }
  console.log(
    `[legislacao-iat-worker] lidas=${r.lidas} novas=${r.novas} atualizadas=${r.atualizadas} revogadas=${r.revogadas} sem_mudanca=${r.semMudanca} data_ato_preenchidas=${preenchidas} data_ato_pendentes=${pendentes} lotes=${lotes}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  const msg = e?.message ?? String(e);
  console.error("[legislacao-iat-worker] erro:", msg);
  // Avisa no sistema que a sincronização automática falhou (dedupe por mensagem não lida).
  try {
    const jaAvisado = await prisma.notificacao.findFirst({
      where: { tipo: "legislacao_iat_erro", lida: false, mensagem: { contains: msg.slice(0, 80) } },
      select: { id: true },
    });
    if (!jaAvisado) {
      await prisma.notificacao.create({
        data: {
          tipo: "legislacao_iat_erro",
          mensagem: `Falha na sincronização automática da Legislação IAT: ${msg}`,
          url: "/ferramentas/iat",
          destinatarioUsuarioId: null,
        },
      });
    }
  } catch {
    // melhor esforço: não mascara o erro original
  }
  await prisma.$disconnect();
  process.exit(1);
});
