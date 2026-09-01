import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string; exigenciaId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("exigencia:editar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { exigenciaId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("descricao" in body) data.descricao = body.descricao;
  if ("prazoResposta" in body) data.prazoResposta = body.prazoResposta ? new Date(body.prazoResposta) : null;
  if ("status" in body) data.status = body.status;
  if ("resposta" in body) data.resposta = body.resposta ?? null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;
  if ("responsavelPessoaId" in body) data.responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;

  try {
    const exigencia = await prisma.exigencia.update({ where: { id: Number(exigenciaId) }, data: data as never });
    await audit({ tipoEntidade: "exigencia", entidadeId: exigencia.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: exigencia.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar exigência." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("exigencia:excluir")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { exigenciaId } = await params;
  await prisma.exigencia.update({ where: { id: Number(exigenciaId) }, data: { ativo: false, deletedAt: new Date() } });
  await audit({ tipoEntidade: "exigencia", entidadeId: Number(exigenciaId), acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
