import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if ("nome" in body) data.nome = body.nome;
  if ("descricao" in body) data.descricao = body.descricao ?? null;
  if ("valorUnitario" in body) data.valorUnitario = Number(body.valorUnitario);
  if ("unidade" in body) data.unidade = body.unidade ?? "und";
  try {
    const servico = await prisma.servico.update({ where: { id: Number(id) }, data: data as never });
    await audit({ tipoEntidade: "servico", entidadeId: servico.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: servico.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar serviço." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.servico.update({ where: { id: Number(id) }, data: { ativo: false, deletedAt: new Date() } });
  await audit({ tipoEntidade: "servico", entidadeId: Number(id), acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
