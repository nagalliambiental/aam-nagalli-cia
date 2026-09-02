import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const licencaId = Number(id);
  const body = await req.json().catch(() => ({}));
  const descricao = (body.descricao as string) ?? "";
  if (!descricao) {
    return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 });
  }
  const tipo = (body.tipo as string) === "informativo" ? "informativo" : "exigencia";

  try {
    const cond = await prisma.condicionante.create({
      data: {
        licencaId,
        codigo: body.codigo ?? null,
        descricao,
        tipo,
        periodicidade: body.periodicidade ?? null,
        dataInicial: body.dataInicial ? new Date(body.dataInicial) : null,
        proximoVencimento: body.proximoVencimento ? new Date(body.proximoVencimento) : null,
        status: body.status ?? "pendente",
        observacoes: body.observacoes ?? null,
        responsavelPessoaId: body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null,
      },
    });
    await audit({
      tipoEntidade: "condicionante",
      entidadeId: cond.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: cond.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar condicionante." }, { status: 500 });
  }
}
