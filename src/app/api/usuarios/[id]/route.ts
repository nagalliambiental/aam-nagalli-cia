import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("usuario:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const usuarioId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("email" in body) {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
    data.email = email;
  }
  if ("perfilId" in body) data.perfilId = Number(body.perfilId);
  if ("pessoaId" in body) data.pessoaId = body.pessoaId ? Number(body.pessoaId) : null;
  if ("ativo" in body) data.ativo = !!body.ativo;
  if (body.senha) {
    if (String(body.senha).length < 6) {
      return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
    }
    data.senhaHash = await bcrypt.hash(String(body.senha), 10);
  }

  try {
    const usuario = await prisma.usuario.update({ where: { id: usuarioId }, data: data as never });
    await audit({
      tipoEntidade: "usuario",
      entidadeId: usuario.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: usuario.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("usuario:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const usuarioId = Number(id);

  if (usuarioId === Number(session.user.id)) {
    return NextResponse.json({ error: "Você não pode excluir o próprio usuário." }, { status: 400 });
  }

  try {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { ativo: false },
    });
    await audit({
      tipoEntidade: "usuario",
      entidadeId: usuarioId,
      acao: "excluir",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao desativar usuário." }, { status: 500 });
  }
}
