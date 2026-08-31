import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const blocos = await prisma.blocoExigenciaTemplate.findMany({
    orderBy: [{ fase: "asc" }, { ordem: "asc" }],
    include: { responsavel: true },
  });
  return NextResponse.json(blocos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("config:criar") && !session.user.permissoes?.includes("config:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fase = (body.fase as string)?.trim();
  const nome = (body.nome as string)?.trim();
  const descricao = (body.descricao as string)?.trim();

  if (!fase || !nome || !descricao) {
    return NextResponse.json({ error: "Fase, nome e descrição são obrigatórios" }, { status: 400 });
  }

  const bloco = await prisma.blocoExigenciaTemplate.create({
    data: {
      fase,
      nome,
      descricao,
      prazoDias: body.prazoDias ? Number(body.prazoDias) : 30,
      unidade: body.unidade ?? "corridos",
      responsavelPessoaId: body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null,
      ordem: body.ordem != null ? Number(body.ordem) : 0,
    },
  });

  await audit({ tipoEntidade: "bloco_exigencia", entidadeId: bloco.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: `${fase} - ${nome}` });

  return NextResponse.json({ id: bloco.id }, { status: 201 });
}
