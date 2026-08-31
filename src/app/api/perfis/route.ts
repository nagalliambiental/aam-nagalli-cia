import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("config:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const nome = String(body.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const permissaoIds: number[] = Array.isArray(body.permissaoIds)
    ? body.permissaoIds.map(Number)
    : [];

  const existe = await prisma.perfil.findUnique({ where: { nome } });
  if (existe) {
    return NextResponse.json({ error: "Já existe um perfil com este nome." }, { status: 409 });
  }

  try {
    const perfil = await prisma.perfil.create({
      data: {
        nome,
        descricao: body.descricao || null,
        permissoes: {
          create: permissaoIds.map((permissaoId) => ({ permissaoId })),
        },
      },
    });
    await audit({
      tipoEntidade: "perfil",
      entidadeId: perfil.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: perfil.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar perfil." }, { status: 500 });
  }
}
