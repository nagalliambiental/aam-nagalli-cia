import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const count = await prisma.notificacao.count({
    where: {
      lida: false,
      OR: [
        { destinatarioUsuarioId: Number(session.user.id) },
        { destinatarioUsuarioId: null },
      ],
    },
  });

  return NextResponse.json({ count });
}
