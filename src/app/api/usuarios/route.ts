import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("usuario:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const senha = String(body.senha ?? "");
  const perfilId = Number(body.perfilId);

  if (!email || !senha) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
  }
  if (!perfilId) {
    return NextResponse.json({ error: "Perfil é obrigatório." }, { status: 400 });
  }

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) {
    return NextResponse.json({ error: "Já existe um usuário com este e-mail." }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    const usuario = await prisma.usuario.create({
      data: {
        email,
        senhaHash,
        perfilId,
        pessoaId: body.pessoaId ? Number(body.pessoaId) : null,
        ativo: body.ativo !== false,
      },
    });
    await audit({
      tipoEntidade: "usuario",
      entidadeId: usuario.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: usuario.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
  }
}
