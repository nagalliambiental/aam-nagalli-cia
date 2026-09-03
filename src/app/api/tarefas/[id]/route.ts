import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { dataLocal } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const tarefaId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("titulo" in body) data.titulo = body.titulo;
  if ("descricao" in body) data.descricao = body.descricao ?? null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;
  if ("responsavelPessoaId" in body) data.responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;
  if ("processoId" in body) data.processoId = body.processoId ? Number(body.processoId) : null;
  if ("empreendimentoId" in body) data.empreendimentoId = body.empreendimentoId ? Number(body.empreendimentoId) : null;
  if ("prazoData" in body) data.prazoData = dataLocal(body.prazoData);
  if ("alertaDias" in body) data.alertaDias = body.alertaDias != null ? Number(body.alertaDias) : null;
  if ("prioridade" in body) data.prioridade = body.prioridade;
  if ("visibilidade" in body) data.visibilidade = body.visibilidade === "privado" ? "privado" : "publico";
  if ("status" in body) {
    data.status = body.status;
    data.dataConclusao = body.status === "concluida" ? new Date() : null;
  }

  try {
    const tarefa = await prisma.tarefa.update({ where: { id: tarefaId }, data: data as never });
    await audit({ tipoEntidade: "tarefa", entidadeId: tarefa.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: tarefa.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar tarefa." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const tarefaId = Number(id);

  try {
    const tarefa = await prisma.tarefa.findUnique({ where: { id: tarefaId }, select: { id: true, exigenciaId: true } });
    if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

    await prisma.$transaction([
      prisma.tarefa.update({ where: { id: tarefaId }, data: { ativo: false, deletedAt: new Date() } }),
      ...(tarefa.exigenciaId
        ? [prisma.exigencia.update({ where: { id: tarefa.exigenciaId }, data: { ativo: false, deletedAt: new Date() } })]
        : []),
    ]);

    await audit({ tipoEntidade: "tarefa", entidadeId: tarefa.id, acao: "excluir", usuarioId: Number(session.user.id) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir tarefa." }, { status: 500 });
  }
}
