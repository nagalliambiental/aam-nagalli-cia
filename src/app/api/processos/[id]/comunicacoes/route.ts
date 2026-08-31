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
  if (!session.user.permissoes?.includes("comunicacao:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const processoId = Number(id);
  const body = await req.json().catch(() => ({}));
  const assunto = (body.assunto as string) ?? "";
  const descricao = (body.descricao as string) ?? "";
  if (!assunto && !descricao) {
    return NextResponse.json({ error: "Informe assunto ou descrição" }, { status: 400 });
  }

  try {
    const comunicacao = await prisma.comunicacao.create({
      data: {
        processoId,
        tipo: body.tipo ?? "email",
        data: body.data ? new Date(body.data) : new Date(),
        remetente: body.remetente ?? null,
        destinatario: body.destinatario ?? null,
        assunto: assunto || null,
        descricao: descricao || null,
        status: body.status ?? "enviada",
        criadoPor: Number(session.user.id),
      },
    });

    await audit({
      tipoEntidade: "comunicacao",
      entidadeId: comunicacao.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
    });

    return NextResponse.json({ id: comunicacao.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar comunicação." }, { status: 500 });
  }
}
