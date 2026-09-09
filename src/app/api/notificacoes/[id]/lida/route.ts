import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  await prisma.notificacao.updateMany({ where: { id: Number(id), lida: false }, data: { lida: true } });
  return NextResponse.json({ ok: true });
}
