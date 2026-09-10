// Worker DOU (para rodar no Render Cron, fora dos limites do Vercel Hobby).
// Lê TODOS os termos (sem o limite de 24 do cron Vercel) e grava as notificações direto no Neon.
// Uso: npx tsx worker/dou.ts  (com DATABASE_URL no ambiente)
import { prisma } from "../src/lib/prisma";
import { buscarDouTermo, dataOntemDmy } from "../src/lib/dou";
import { montarTermosDou } from "../src/lib/dou-termos";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const data = dataOntemDmy();
  console.log(`[dou-worker] data=${data}`);

  const [empresas, empreendimentos, processos, config] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, cnpj: true, cpf: true, razaoSocial: true, nomeFantasia: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true, apelido: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, numero: true, nup: true } }),
    prisma.douConfiguracao.findUnique({ where: { id: 1 } }),
  ]);
  const automaticos = montarTermosDou(empresas, empreendimentos, processos, []).map((t) => ({ text: t.text, tipo: t.origem, id: t.id ?? 0 }));
  const extras = (config?.termosExtras ?? "").split(/\r?\n/).map((text) => text.trim()).filter(Boolean).map((text) => ({ text, tipo: "manual", id: 0 }));
  const lista = [...extras, ...automaticos];
  console.log(`[dou-worker] termos=${lista.length}`);

  let notificacoes = 0;
  const vistos = new Set<string>();
  for (const t of lista) {
    const resultados = await buscarDouTermo(t.text, data).catch(() => []);
    for (const r of resultados) {
      if (!r.id || vistos.has(r.id)) continue;
      vistos.add(r.id);
      const ja = await prisma.notificacao.findFirst({
        where: { tipo: "dou_notificacao", mensagem: `DOU ${r.secao} (${r.titulo})`, lida: false },
      });
      if (ja) continue;
      await prisma.notificacao.create({
        data: {
          tipo: "dou_notificacao",
          mensagem: `DOU ${r.secao}: ${r.titulo} (termo: ${t.text})`,
          url: r.url || null,
          termo: `${t.tipo}:${t.text}`,
          processoId: t.tipo === "processo" ? t.id : undefined,
          destinatarioUsuarioId: null,
        },
      });
      notificacoes++;
    }
    await sleep(250);
  }
  console.log(`[dou-worker] concluido notificacoes=${notificacoes}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[dou-worker] erro:", e?.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
