import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultarSigmineEvento } from "@/lib/sigmine";
import { consultarAndamentosSei } from "@/lib/sei";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET ?? "";

function autorizado(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const authz = req.headers.get("authorization") ?? "";
  return authz === `Bearer ${CRON_SECRET}`;
}

/** Dia (em dias desde época, UTC) correspondente a "dd/mm/aaaa". */
function diaNum(s: string): number {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return -1;
  return Math.floor(Date.UTC(+m[3], +m[2] - 1, +m[1]) / 86400000);
}

/** Dia de hoje em Brasília (UTC-3, sem DST no BR desde 2019). */
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

/**
 * Cron diário (07h de Brasília): consulta movimentações de cada processo ativo
 * (SEI via token; fallback SIGMINE) e notifica APENAS se o último evento for de
 * HOJE ou ONTEM, sem repetir aviso para o mesmo evento já registrado.
 */
export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const processos = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
    select: { id: true, numero: true, seiUrl: true, ultimoEventoSigmine: true, ultimoEventoData: true },
  });

  let novos = 0;
  let semDados = 0;
  const detalhes: { id: number; numero: string; novo: boolean; fonte: "SEI" | "SIGMINE"; evento?: string }[] = [];
  const hoje = diaHojeSP();

  for (const p of processos) {
    let descricao: string | null = null;
    let dia: number = -1;
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

    const baselineData = p.ultimoEventoData
      ? Math.floor(Date.UTC(p.ultimoEventoData.getFullYear(), p.ultimoEventoData.getMonth(), p.ultimoEventoData.getDate()) / 86400000)
      : -1;
    const jaRegistrado = descricao === p.ultimoEventoSigmine && baselineData === dia;
    const recente = dia >= 0 ? hoje - dia <= 1 && dia <= hoje : false;

    if (!jaRegistrado) {
      await prisma.processo.update({
        where: { id: p.id },
        data: { ultimoEventoSigmine: descricao, ultimoEventoData: data },
      });
      if (recente) {
        const jaNotificado = await prisma.notificacao.findFirst({
          where: {
            tipo: "sei_movimentacao",
            processoId: p.id,
            mensagem: `Nova movimentação no processo ${p.numero}: ${descricao}`,
            lida: false,
          },
        });
        if (!jaNotificado) {
          await prisma.notificacao.create({
            data: {
              tipo: "sei_movimentacao",
              mensagem: `Nova movimentação no processo ${p.numero}: ${descricao}`,
              processoId: p.id,
              destinatarioUsuarioId: null,
            },
          });
          novos++;
        }
        detalhes.push({ id: p.id, numero: p.numero, novo: true, fonte, evento: descricao ?? undefined });
      } else {
        detalhes.push({ id: p.id, numero: p.numero, novo: false, fonte });
      }
    } else {
      detalhes.push({ id: p.id, numero: p.numero, novo: false, fonte });
    }
  }

  return NextResponse.json({ ok: true, checkados: processos.length, novos, semDados, hoje: new Date(hoje * 86400000).toISOString().slice(0, 10) });
}
