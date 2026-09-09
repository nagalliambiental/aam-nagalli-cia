import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.perfilNome !== "Administrador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const backups = await prisma.backupArquivo.findMany({ orderBy: { criadoEm: "desc" }, select: { id: true, nome: true, tamanho: true, criadoEm: true } });
  return NextResponse.json(backups);
}
