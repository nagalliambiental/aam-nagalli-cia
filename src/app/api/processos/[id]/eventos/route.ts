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
  if (!session.user.permissoes?.includes("processo:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const processoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const tipoEventoId = body.tipoEventoId ? Number(body.tipoEventoId) : null;
  const descricao = (body.descricao as string) ?? "";

  if (!tipoEventoId || !descricao) {
    return NextResponse.json({ error: "Tipo e descrição são obrigatórios" }, { status: 400 });
  }

  try {
    const evento = await prisma.evento.create({
      data: {
        processoId,
        tipoEventoId,
        descricao,
        data: body.data ? new Date(body.data) : new Date(),
        criadoPor: Number(session.user.id),
      },
    });

    await audit({
      tipoEntidade: "processo",
      entidadeId: processoId,
      acao: "evento_criado",
      usuarioId: Number(session.user.id),
      valorNovo: descricao,
    });

    return NextResponse.json({ id: evento.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar evento." }, { status: 500 });
  }
}
