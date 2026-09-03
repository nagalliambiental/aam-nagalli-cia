// Worker Movimentações SEI (para Render Cron, sem o limite de 60s do Vercel).
// Percorre TODOS os processos ativos: SEI via token (URL cadastrada) + fallback SIGMINE,
// atualiza a base e notifica só movimentação nova de hoje/ontem.
// Uso: npx tsx worker/movimentacoes.ts  (com DATABASE_URL no ambiente)
import { prisma } from "../src/lib/prisma";
import { consultarSigmineEvento } from "../src/lib/sigmine";
import { consultarAndamentosSei } from "../src/lib/sei";

function diaNum(s: string): number {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return -1;
  return Math.floor(Date.UTC(+m[3], +m[2] - 1, +m[1]) / 86400000);
}

function diaHojeSP(): number {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, mo, d] = dtf.format(new Date()).split("-");
  return Math.floor(Date.UTC(+y, +mo - 1, +d) / 86400000);
}

async function main() {
  const processos = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
    select: { id: true, numero: true, seiUrl: true, ultimoEventoSigmine: true, ultimoEventoData: true },
  });
  console.log(`[mov-worker] processos=${processos.length}`);

  const hoje = diaHojeSP();
  let novos = 0;
  let semDados = 0;

  for (const p of processos) {
    let descricao: string | null = null;
    let dia = -1;
    let data: Date | null = null;
    let fonte: "SEI" | "SIGMINE" = "SIGMINE";

    if (p.seiUrl && p.seiUrl.includes("md_pesq_processo_exibir")) {
      const ands = await consultarAndamentosSei(p.seiUrl).catch(() => []);
      if (ands.length > 0) {
        descricao = ands[0].descricao;
        dia = diaNum(ands[0].data);
        if (dia >= 0) {
          const [d, mo, y] = ands[0].data.split("/");
          data = new Date(+y, +mo - 1, +d);
        }
        fonte = "SEI";
      }
    }

    if (data === null) {
      const ev = await consultarSigmineEvento(p.numero).catch(() => null);
      if (!ev) {
        semDados++;
        continue;
      }
      descricao = ev.descricao;
      data = ev.data;
      fonte = "SIGMINE";
      dia = ev.data ? Math.floor(Date.UTC(ev.data.getFullYear(), ev.data.getMonth(), ev.data.getDate()) / 86400000) : -1;
    }

    const baseline = p.ultimoEventoData
      ? Math.floor(Date.UTC(p.ultimoEventoData.getFullYear(), p.ultimoEventoData.getMonth(), p.ultimoEventoData.getDate()) / 86400000)
      : -1;
    const jaRegistrado = descricao === p.ultimoEventoSigmine && baseline === dia;
    const recente = dia >= 0 ? hoje - dia <= 1 && dia <= hoje : false;

    if (!jaRegistrado) {
      await prisma.processo.update({
        where: { id: p.id },
        data: { ultimoEventoSigmine: descricao, ultimoEventoData: data },
      });
      if (recente) {
        const ja = await prisma.notificacao.findFirst({
          where: { tipo: "sei_movimentacao", processoId: p.id, mensagem: `Nova movimentação no processo ${p.numero}: ${descricao}`, lida: false },
        });
        if (!ja) {
          await prisma.notificacao.create({
            data: { tipo: "sei_movimentacao", mensagem: `Nova movimentação no processo ${p.numero}: ${descricao}`, processoId: p.id, destinatarioUsuarioId: null },
          });
          novos++;
        }
      }
    }
  }

  console.log(`[mov-worker] concluido novos=${novos} semDados=${semDados}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[mov-worker] erro:", e?.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
