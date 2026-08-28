import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("processo:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const numero = (body.numero as string) ?? "";
  if (!numero) {
    return NextResponse.json({ error: "Número é obrigatório" }, { status: 400 });
  }

  try {
    const processo = await prisma.processo.create({
      data: {
        numero,
        orgaoId: body.orgaoId,
        tipoProcessoId: body.tipoProcessoId,
        empreendimentoId: body.empreendimentoId ?? null,
        assunto: body.assunto ?? null,
        fase: body.fase ?? null,
        status: body.status ?? "em_andamento",
        dataAbertura: body.dataAbertura ? new Date(body.dataAbertura) : new Date(),
        descricao: body.descricao ?? null,
        observacoes: body.observacoes ?? null,
      },
    });

    await audit({
      tipoEntidade: "processo",
      entidadeId: processo.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: processo.numero,
    });

    return NextResponse.json({ id: processo.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar processo." }, { status: 500 });
  }
}
