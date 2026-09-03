import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  const fatura = await prisma.fatura.findFirst({
    where: { id: Number(id), ativo: true, deletedAt: null },
    include: { empresa: true, empreendimento: true, itens: { orderBy: { id: "asc" } } },
  });
  if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
  return NextResponse.json(fatura);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const fatura = await prisma.fatura.update({
      where: { id: Number(id) },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.observacoes !== undefined ? { observacoes: body.observacoes ?? null } : {}),
      },
    });
    await audit({ tipoEntidade: "fatura", entidadeId: fatura.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: fatura.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar fatura." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.fatura.update({ where: { id: Number(id) }, data: { ativo: false, deletedAt: new Date() } });
  await audit({ tipoEntidade: "fatura", entidadeId: Number(id), acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
