import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultarSigmineEvento } from "@/lib/sigmine";

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

/**
 * Cron diário: consulta o SIGMINE (dados abertos da ANM) de cada processo ativo,
 * deteca se o último evento mudou desde a última verificação e, se sim, registra
 * o evento e cria uma notificação global (Dashboard/sino).
 */
export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const processos = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
    select: { id: true, numero: true, ultimoEventoSigmine: true, ultimoEventoData: true },
  });

  let novos = 0;
  let semDados = 0;
  const detalhes: { id: number; numero: string; novo: boolean; evento?: string }[] = [];

  for (const p of processos) {
    const ev = await consultarSigmineEvento(p.numero);
    if (!ev) {
      semDados++;
      continue;
    }
    if (ehNovo(p.ultimoEventoData, ev.data)) {
      await prisma.processo.update({
        where: { id: p.id },
        data: { ultimoEventoSigmine: ev.evento, ultimoEventoData: ev.data },
      });
      // Só notifica a partir da segunda execução (a primeira é o "seed" do estado
      // inicial, senão dispara notificação para processos já conhecidos).
      if (p.ultimoEventoData !== null) {
        await prisma.notificacao.create({
          data: {
            tipo: "sei_movimentacao",
            mensagem: `Nova movimentação no processo ${p.numero}: ${ev.descricao}`,
            processoId: p.id,
            destinatarioUsuarioId: null, // global: aparece no Dashboard/sino de todos
          },
        });
        novos++;
      }
      detalhes.push({ id: p.id, numero: p.numero, novo: true, evento: ev.descricao });
    } else {
      detalhes.push({ id: p.id, numero: p.numero, novo: false });
    }
  }

  return NextResponse.json({ ok: true, checkados: processos.length, novos, semDados });
}
