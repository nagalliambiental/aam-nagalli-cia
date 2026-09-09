import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.perfilNome !== "Administrador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  const backup = await prisma.backupArquivo.findUnique({ where: { id: Number(id) }, select: { nome: true, arquivo: true } });
  if (!backup) return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });
  return new NextResponse(Buffer.from(backup.arquivo), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${backup.nome}"` } });
}
