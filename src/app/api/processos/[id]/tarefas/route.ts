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
  if (!session.user.permissoes?.includes("tarefa:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const processoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const titulo = (body.titulo as string) ?? "";
  if (!titulo) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  const responsavelPessoaId = body.responsavelPessoaId
    ? Number(body.responsavelPessoaId)
    : null;
  if (!responsavelPessoaId) {
    return NextResponse.json({ error: "Responsável é obrigatório" }, { status: 400 });
  }

  try {
    const tarefa = await prisma.tarefa.create({
      data: {
        titulo,
        processoId,
        responsavelPessoaId,
        prioridade: body.prioridade ?? "media",
        status: body.status ?? "pendente",
        prazoData: body.prazoData ? new Date(body.prazoData) : null,
        criadorUsuarioId: Number(session.user.id),
      },
    });

    await audit({
      tipoEntidade: "tarefa",
      entidadeId: tarefa.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: titulo,
    });

    return NextResponse.json({ id: tarefa.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar tarefa." }, { status: 500 });
  }
}
