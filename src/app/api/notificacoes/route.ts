import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const notificacoes = await prisma.notificacao.findMany({
    where: {
      destinatarioUsuarioId: Number(session.user.id),
      lida: false,
    },
    orderBy: { dataEnvio: "desc" },
    take: 10,
    select: {
      id: true,
      tipo: true,
      mensagem: true,
      canal: true,
      lida: true,
      dataEnvio: true,
      processoId: true,
      prazoId: true,
      tarefaId: true,
      licencaId: true,
    },
  });

  return NextResponse.json(notificacoes);
}
