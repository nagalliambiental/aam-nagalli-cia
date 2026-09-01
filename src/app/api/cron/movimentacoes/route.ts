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

function ehNovo(anterior: Date | null, atual: Date | null): boolean {
  if (!atual) return false;
  if (!anterior) return true; // primeira vez: registra sem notificar (seed)
  return atual.getTime() > anterior.getTime();
}

/** Converte "dd/mm/aaaa" em Date (para comparação). */
function parseDataBR(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const a = parseInt(m[3], 10);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return new Date(a, mo - 1, d);
}

/**
 * Cron diário: consulta movimentações de cada processo ativo.
 * Fonte primária: SEI (URL de exibição/token, sem captcha) — quando já salva no
 * processo. Fallback: SIGMINE (último evento). Se o último evento mudar e for
 * posterior ao registrado, cria notificação global (Dashboard/sino).
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

  for (const p of processos) {
    let descricao: string | null = null;
    let data: Date | null = null;
    let fonte: "SEI" | "SIGMINE" = "SIGMINE";

    // Primária: SEI (token) — sem captcha.
    if (p.seiUrl && p.seiUrl.includes("md_pesq_processo_exibir")) {
      const ands = await consultarAndamentosSei(p.seiUrl).catch(() => []);
      if (ands.length > 0) {
        descricao = ands[0].descricao; // página lista o mais recente primeiro
        data = parseDataBR(ands[0].data);
        fonte = "SEI";
      }
    }

    // Fallback: SIGMINE.
    if (data === null) {
      const ev = await consultarSigmineEvento(p.numero).catch(() => null);
      if (!ev) {
        semDados++;
        continue;
      }
      descricao = ev.descricao;
      data = ev.data;
      fonte = "SIGMINE";
    }

    if (ehNovo(p.ultimoEventoData, data)) {
      await prisma.processo.update({
        where: { id: p.id },
        data: { ultimoEventoSigmine: descricao, ultimoEventoData: data },
      });
      if (p.ultimoEventoData !== null) {
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
      }
      detalhes.push({ id: p.id, numero: p.numero, novo: true, fonte, evento: descricao ?? undefined });
    } else {
      detalhes.push({ id: p.id, numero: p.numero, novo: false, fonte });
    }
  }

  return NextResponse.json({ ok: true, checkados: processos.length, novos, semDados });
}
