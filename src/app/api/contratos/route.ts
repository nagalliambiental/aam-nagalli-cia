import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const empresaId = Number(body.empresaId);
  if (!empresaId) {
    return NextResponse.json({ error: "Cliente é obrigatório" }, { status: 400 });
  }

  try {
    const contrato = await prisma.contrato.create({
      data: {
        empresaId,
        numero: body.numero ?? null,
        descricao: body.descricao ?? null,
        dataAssinatura: body.dataAssinatura ? new Date(body.dataAssinatura) : null,
        dataValidade: body.dataValidade ? new Date(body.dataValidade) : null,
        observacoes: body.observacoes ?? null,
      },
    });

    await audit({
      tipoEntidade: "contrato",
      entidadeId: contrato.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
    });

    return NextResponse.json({ id: contrato.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar contrato." }, { status: 500 });
  }
}
