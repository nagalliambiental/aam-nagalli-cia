import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const importId = (body.importId as string) ?? "";
  if (!importId) return NextResponse.json({ error: "importId não informado" }, { status: 400 });

  try {
    const tarefas = await prisma.tarefa.findMany({ where: { importId }, select: { id: true, exigenciaId: true } });
    if (tarefas.length === 0) {
      return NextResponse.json({ error: "Nenhuma tarefa encontrada para este lote." }, { status: 404 });
    }
    const exigenciaIds = tarefas.map((t) => t.exigenciaId).filter((x): x is number => x != null);

    await prisma.$transaction([
      prisma.tarefa.updateMany({ where: { importId }, data: { ativo: false, deletedAt: new Date() } }),
      ...(exigenciaIds.length
        ? [prisma.exigencia.updateMany({ where: { id: { in: exigenciaIds } }, data: { ativo: false, deletedAt: new Date() } })]
        : []),
    ]);

    return NextResponse.json({ removidas: tarefas.length });
  } catch {
    return NextResponse.json({ error: "Erro ao desfazer importação." }, { status: 500 });
  }
}
