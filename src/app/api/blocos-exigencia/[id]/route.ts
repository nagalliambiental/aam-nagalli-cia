import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("config:editar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const blocoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("fase" in body) data.fase = body.fase;
  if ("nome" in body) data.nome = body.nome;
  if ("descricao" in body) data.descricao = body.descricao;
  if ("prazoDias" in body) data.prazoDias = Number(body.prazoDias);
  if ("unidade" in body) data.unidade = body.unidade;
  if ("responsavelPessoaId" in body) data.responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;
  if ("ordem" in body) data.ordem = Number(body.ordem);
  if ("ativo" in body) data.ativo = !!body.ativo;

  try {
    const bloco = await prisma.blocoExigenciaTemplate.update({ where: { id: blocoId }, data: data as never });
    await audit({ tipoEntidade: "bloco_exigencia", entidadeId: bloco.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: bloco.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("config:excluir")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  await prisma.blocoExigenciaTemplate.update({ where: { id: Number(id) }, data: { ativo: false } });
  await audit({ tipoEntidade: "bloco_exigencia", entidadeId: Number(id), acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
