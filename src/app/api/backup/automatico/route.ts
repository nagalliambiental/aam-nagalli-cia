import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const QUINZE_DIAS = 15 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.perfilNome !== "Administrador") return NextResponse.json({ due: false });
  const ultimo = await prisma.backupArquivo.findFirst({ where: { automatico: true }, orderBy: { criadoEm: "desc" }, select: { criadoEm: true } });
  const due = !ultimo || Date.now() - ultimo.criadoEm.getTime() >= QUINZE_DIAS;
  return NextResponse.json({ due });
}
