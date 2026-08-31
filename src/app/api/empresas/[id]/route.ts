import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CAMPOS = [
  "razaoSocial", "nomeFantasia", "apelido", "cnpj", "inscricaoEstadual", "email",
  "telefone", "endereco", "municipio", "uf", "cep", "observacoes",
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
  const empresaId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    if (c in body) data[c] = (body[c] as string) ?? null;
  }
  if (data.cnpj) {
    const cnpj = String(data.cnpj).replace(/\D/g, "");
    data.cnpj = cnpj || null;
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: data as never,
    });

    await audit({
      tipoEntidade: "empresa",
      entidadeId: empresa.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });

    return NextResponse.json({ id: empresa.id });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? "Já existe empresa com este CNPJ."
      : "Erro ao atualizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
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
  const empresaId = Number(id);

  // Soft delete
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { ativo: false, deletedAt: new Date() },
  });

  await audit({
    tipoEntidade: "empresa",
    entidadeId: empresaId,
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });

  return NextResponse.json({ ok: true });
}
