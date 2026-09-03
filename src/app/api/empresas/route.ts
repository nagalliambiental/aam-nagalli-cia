import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CAMPOS = [
  "razaoSocial", "nomeFantasia", "apelido", "cnpj", "inscricaoEstadual", "email",
  "telefone", "endereco", "numeroEndereco", "municipio", "uf", "cep", "observacoes",
] as const;

interface ContatoInput {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  assunto?: string | null;
}

function normalizarContatos(contatos: unknown): ContatoInput[] {
  if (!Array.isArray(contatos)) return [];
  return contatos
    .filter((c) => c && typeof c === "object")
    .map((c) => {
      const o = c as ContatoInput;
      return {
        nome: (o.nome as string)?.trim() || null,
        email: (o.email as string)?.trim() || null,
        telefone: (o.telefone as string)?.trim() || null,
        assunto: (o.assunto as string)?.trim() || null,
      };
    })
    .filter((c) => c.nome || c.email || c.telefone || c.assunto);
}

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
    const contatos = normalizarContatos(body.contatos);
    const empresa = await prisma.empresa.create({
      data: {
        ...data,
        contatos: contatos.length ? { create: contatos } : undefined,
      } as never,
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
