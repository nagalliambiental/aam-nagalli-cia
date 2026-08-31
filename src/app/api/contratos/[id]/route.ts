import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const contratoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  const str = ["numero", "descricao", "observacoes"] as const;
  for (const c of str) {
    if (c in body) data[c] = body[c] ?? null;
  }
  if ("empresaId" in body) data.empresaId = Number(body.empresaId);
  if ("dataAssinatura" in body) data.dataAssinatura = body.dataAssinatura ? new Date(body.dataAssinatura) : null;
  if ("dataValidade" in body) data.dataValidade = body.dataValidade ? new Date(body.dataValidade) : null;

  try {
    const contrato = await prisma.contrato.update({ where: { id: contratoId }, data: data as never });
    await audit({
      tipoEntidade: "contrato",
      entidadeId: contrato.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: contrato.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.contrato.update({
    where: { id: Number(id) },
    data: { ativo: false, deletedAt: new Date() },
  });
  await audit({
    tipoEntidade: "contrato",
    entidadeId: Number(id),
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });
  return NextResponse.json({ ok: true });
}
