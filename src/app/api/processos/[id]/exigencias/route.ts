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
  if (!session.user.permissoes?.includes("exigencia:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const processoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const descricao = (body.descricao as string) ?? "";
  if (!descricao) {
    return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 });
  }

  // Usa o órgão do processo como origem da exigência.
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    select: { orgaoId: true },
  });
  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  try {
    const exigencia = await prisma.exigencia.create({
      data: {
        processoId,
        orgaoId: processo.orgaoId,
        descricao,
        dataRecebimento: body.dataRecebimento ? new Date(body.dataRecebimento) : new Date(),
        prazoResposta: body.prazoResposta ? new Date(body.prazoResposta) : null,
        status: "pendente",
      },
    });

    await audit({
      tipoEntidade: "exigencia",
      entidadeId: exigencia.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: descricao,
    });

    return NextResponse.json({ id: exigencia.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar exigência." }, { status: 500 });
  }
}
