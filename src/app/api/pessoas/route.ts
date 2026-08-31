import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CAMPOS = [
  "nome", "documento", "tipoPessoa", "email", "telefone", "endereco", "cep", "observacoes",
] as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    if (c in body) data[c] = (body[c] as string) ?? null;
  }
  if (!data.nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  try {
    const pessoa = await prisma.pessoa.create({ data: data as never });
    await audit({
      tipoEntidade: "pessoa",
      entidadeId: pessoa.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: pessoa.nome,
    });
    return NextResponse.json({ id: pessoa.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar pessoa." }, { status: 500 });
  }
}
