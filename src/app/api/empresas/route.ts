import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CAMPOS = [
  "razaoSocial", "nomeFantasia", "apelido", "cnpj", "inscricaoEstadual", "email",
  "telefone", "endereco", "municipio", "uf", "cep", "observacoes",
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
  if (!data.razaoSocial) {
    return NextResponse.json({ error: "Razão social é obrigatória" }, { status: 400 });
  }
  if (data.cnpj) {
    const cnpj = String(data.cnpj).replace(/\D/g, "");
    data.cnpj = cnpj || null;
  }

  try {
    const empresa = await prisma.empresa.create({
      data: data as never,
    });

    await audit({
      tipoEntidade: "empresa",
      entidadeId: empresa.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: empresa.razaoSocial,
    });

    return NextResponse.json({ id: empresa.id }, { status: 201 });
  } catch (e) {
    const isDup = (e as { code?: string })?.code === "P2002";
    if (isDup) {
      const existente = data.cnpj
        ? await prisma.empresa.findUnique({ where: { cnpj: data.cnpj as string }, select: { id: true } })
        : null;
      return NextResponse.json(
        { error: "Empresa já cadastrada com este CNPJ.", existingId: existente?.id ?? undefined },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erro ao criar empresa." }, { status: 500 });
  }
}
