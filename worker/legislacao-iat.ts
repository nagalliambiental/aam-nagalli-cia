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
  console.error("[legislacao-iat-worker] erro:", e?.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
