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
  const areaId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  const campos = ["nome", "tipo", "matricula", "municipio", "uf", "situacao", "coordenadas", "observacoes"] as const;
  for (const c of campos) {
    if (c in body) data[c] = body[c] ?? null;
  }
  if ("areaHa" in body) data.areaHa = body.areaHa != null ? Number(body.areaHa) : null;

  try {
    const area = await prisma.area.update({ where: { id: areaId }, data: data as never });
    await audit({
      tipoEntidade: "area",
      entidadeId: area.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: area.id });
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
  await prisma.area.update({
    where: { id: Number(id) },
    data: { ativo: false, deletedAt: new Date() },
  });
  await audit({
    tipoEntidade: "area",
    entidadeId: Number(id),
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });
  return NextResponse.json({ ok: true });
}
