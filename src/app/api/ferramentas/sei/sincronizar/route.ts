import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consultarPaginaSei } from "@/lib/sei";
import { salvarProtocolosSei } from "@/lib/sei-protocolos";

function dataSei(value: string) { const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12) : null; }

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:editar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const processos = await prisma.processo.findMany({ where: { ativo: true, deletedAt: null, natureza: "minerario", seiUrl: { not: null } }, select: { id: true, numero: true, seiUrl: true, ultimoEventoSigmine: true, ultimoEventoData: true } });
  let consultados = 0; let novosProtocolos = 0; let novasMovimentacoes = 0;
  for (const processo of processos) {
    if (!processo.seiUrl) continue;
    const resultado = await consultarPaginaSei(processo.seiUrl).catch(() => null);
    if (!resultado) continue;
    consultados++;
    novosProtocolos += (await salvarProtocolosSei(processo.id, resultado.protocolos, true)).length;
    const andamento = resultado.andamentos[0];
    if (andamento && andamento.descricao !== processo.ultimoEventoSigmine) {
      const dataEvento = dataSei(andamento.data);
      await prisma.processo.update({ where: { id: processo.id }, data: { ultimoEventoSigmine: andamento.descricao, ultimoEventoData: dataEvento } });
      await prisma.notificacao.create({ data: { tipo: "sei_movimentacao", mensagem: `Nova movimentação no processo ${processo.numero}: ${andamento.descricao}`, processoId: processo.id, dataEvento, destinatarioUsuarioId: null } });
      novasMovimentacoes++;
    }
  }
  return NextResponse.json({ ok: true, processos: processos.length, consultados, novosProtocolos, novasMovimentacoes });
}
