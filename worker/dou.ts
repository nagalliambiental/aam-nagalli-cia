// Worker DOU (para rodar no Render Cron, fora dos limites do Vercel Hobby).
// Lê TODOS os termos (sem o limite de 24 do cron Vercel) e grava as notificações direto no Neon.
// Uso: npx tsx worker/dou.ts  (com DATABASE_URL no ambiente)
import { prisma } from "../src/lib/prisma";
import { buscarDouTermo, dataOntemDmy } from "../src/lib/dou";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const data = dataOntemDmy();
  console.log(`[dou-worker] data=${data}`);

  const [empresas, empreendimentos, processos] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, cnpj: true, razaoSocial: true, nomeFantasia: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true, apelido: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, numero: true, nup: true } }),
  ]);

  const termos: { text: string; tipo: string; id: number }[] = [];
  for (const e of empresas) {
    if (e.cnpj) termos.push({ text: e.cnpj.replace(/\D/g, ""), tipo: "empresa", id: e.id });
    if (e.razaoSocial) termos.push({ text: e.razaoSocial, tipo: "empresa", id: e.id });
    if (e.nomeFantasia) termos.push({ text: e.nomeFantasia, tipo: "empresa", id: e.id });
  }
  for (const emp of empreendimentos) {
    termos.push({ text: emp.nome, tipo: "empreendimento", id: emp.id });
    if (emp.apelido) termos.push({ text: emp.apelido, tipo: "empreendimento", id: emp.id });
  }
  for (const p of processos) {
    if (p.nup) termos.push({ text: p.nup, tipo: "processo", id: p.id });
    termos.push({ text: p.numero, tipo: "processo", id: p.id });
  }
  const lista = termos.filter((t) => t.text.trim());
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
          mensagem: `DOU ${r.secao}: ${r.titulo}`,
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
