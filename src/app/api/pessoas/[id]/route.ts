import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CAMPOS = [
  "nome", "documento", "tipoPessoa", "email", "telefone", "endereco", "cep", "observacoes",
] as const;

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
  const pessoaId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    if (c in body) data[c] = (body[c] as string) ?? null;
  }

  try {
    const pessoa = await prisma.pessoa.update({
      where: { id: pessoaId },
      data: data as never,
    });
    await audit({
      tipoEntidade: "pessoa",
      entidadeId: pessoa.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: pessoa.id });
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
  const pessoaId = Number(id);

  await prisma.pessoa.update({
    where: { id: pessoaId },
    data: { ativo: false, deletedAt: new Date() },
  });
  await audit({
    tipoEntidade: "pessoa",
    entidadeId: pessoaId,
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });
  return NextResponse.json({ ok: true });
}
