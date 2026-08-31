import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await prisma.notificacao.updateMany({
    where: {
      destinatarioUsuarioId: Number(session.user.id),
      lida: false,
    },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}
