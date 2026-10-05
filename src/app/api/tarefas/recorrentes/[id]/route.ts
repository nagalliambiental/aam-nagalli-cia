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
  const regraId = Number(id);
  const regra = await prisma.tarefaRecorrente.findUnique({ where: { id: regraId } });
  if (!regra) return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if ("intervaloDias" in body) {
    const n = Number(body.intervaloDias);
    if (!Number.isFinite(n) || n < 1 || n > 3650) {
      return NextResponse.json({ error: "Intervalo inválido (1 a 3650 dias)" }, { status: 400 });
    }
    data.intervaloDias = Math.floor(n);
  }
  if ("fimRecorrencia" in body) data.fimRecorrencia = dataLocal(body.fimRecorrencia);
  if ("ativo" in body) data.ativo = !!body.ativo;
  if ("responsavelPessoaId" in body) {
    const pessoaId = Number(body.responsavelPessoaId);
    if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
      return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });
    }
    const pessoa = await prisma.pessoa.findFirst({ where: { id: pessoaId, ativo: true, deletedAt: null }, select: { id: true } });
    if (!pessoa) return NextResponse.json({ error: "Responsável não encontrado" }, { status: 404 });
    data.responsavelPessoaId = pessoaId;
  }

  try {
    const atualizada = await prisma.tarefaRecorrente.update({ where: { id: regraId }, data: data as never });
    await audit({
      tipoEntidade: "tarefa",
      entidadeId: regraId,
      acao: "editar",
      usuarioId: Number(session.user.id),
      campo: "regra_recorrente",
      valorAnterior: `a cada ${regra.intervaloDias} dias`,
      valorNovo: `a cada ${atualizada.intervaloDias} dias`,
    });
    return NextResponse.json({ id: atualizada.id, ativo: atualizada.ativo });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar regra." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const regraId = Number(id);
  const regra = await prisma.tarefaRecorrente.findUnique({ where: { id: regraId }, select: { id: true, titulo: true } });
  if (!regra) return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });

  try {
    await prisma.tarefaRecorrente.delete({ where: { id: regraId } });
    await audit({ tipoEntidade: "tarefa", entidadeId: regraId, acao: "excluir", usuarioId: Number(session.user.id), campo: "regra_recorrente", valorNovo: regra.titulo });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir regra." }, { status: 500 });
  }
}
