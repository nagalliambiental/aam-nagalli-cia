import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const pedido = await prisma.pedido.findFirst({
    where: { id: Number(id), ativo: true, deletedAt: null },
    include: { empresa: true, itens: { include: { servico: true } } },
  });
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json(pedido);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("custo:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if ("status" in body) data.status = body.status;
  if ("descontoTipo" in body) data.descontoTipo = body.descontoTipo || null;
  if ("descontoValor" in body) data.descontoValor = body.descontoValor != null && body.descontoValor !== "" ? Number(body.descontoValor) : null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;

  // Recalcula total caso desconto mude.
  if ("descontoTipo" in body || "descontoValor" in body) {
    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) }, include: { itens: true } });
    if (pedido) {
      const subtotal = Number(pedido.subtotal);
      const dv = data.descontoValor != null ? Number(data.descontoValor) : 0;
      const tipo = data.descontoTipo as string | null;
      let desconto = 0;
      if (tipo === "percentual") desconto = subtotal * (Math.min(100, dv) / 100);
      else if (tipo === "valor") desconto = Math.min(dv, subtotal);
      data.total = Math.round((subtotal - desconto) * 100) / 100;
    }
  }

  try {
    const pedido = await prisma.pedido.update({ where: { id: Number(id) }, data: data as never });
    await audit({ tipoEntidade: "pedido", entidadeId: pedido.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: pedido.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar pedido." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("custo:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.pedido.update({ where: { id: Number(id) }, data: { ativo: false, deletedAt: new Date() } });
  await audit({ tipoEntidade: "pedido", entidadeId: Number(id), acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
