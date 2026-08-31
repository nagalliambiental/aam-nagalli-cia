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
  if (!session.user.permissoes?.includes("config:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const perfilId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("nome" in body) {
    const nome = String(body.nome ?? "").trim();
    if (!nome) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    data.nome = nome;
  }
  if ("descricao" in body) data.descricao = body.descricao || null;

  try {
    // atualiza nome/descricao e sincroniza permissões numa transação
    const perfil = await prisma.$transaction(async (tx) => {
      const updated = await tx.perfil.update({ where: { id: perfilId }, data: data as never });
      if (Array.isArray(body.permissaoIds)) {
        const ids = body.permissaoIds.map(Number);
        await tx.perfilPermissao.deleteMany({ where: { perfilId } });
        if (ids.length > 0) {
          await tx.perfilPermissao.createMany({
            data: ids.map((permissaoId: number) => ({ perfilId, permissaoId })),
            skipDuplicates: true,
          });
        }
      }
      return updated;
    });

    await audit({
      tipoEntidade: "perfil",
      entidadeId: perfil.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: perfil.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("config:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const perfilId = Number(id);

  const perfil = await prisma.perfil.findUnique({
    where: { id: perfilId },
    include: { _count: { select: { usuarios: true } } },
  });
  if (!perfil) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  if (perfil.sistema) {
    return NextResponse.json({ error: "Perfis de sistema não podem ser excluídos." }, { status: 400 });
  }
  if (perfil._count.usuarios > 0) {
    return NextResponse.json(
      { error: "Exclua ou mova os usuários deste perfil antes." },
      { status: 400 }
    );
  }

  try {
    await prisma.perfil.update({
      where: { id: perfilId },
      data: { ativo: false },
    });
    await audit({
      tipoEntidade: "perfil",
      entidadeId: perfilId,
      acao: "excluir",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao desativar perfil." }, { status: 500 });
  }
}
