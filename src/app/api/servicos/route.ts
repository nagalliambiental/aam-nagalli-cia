import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const servicos = await prisma.servico.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, descricao: true, valorUnitario: true, unidade: true },
  });
  return NextResponse.json(servicos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const nome = (body.nome as string) ?? "";
  const valorUnitario = Number(body.valorUnitario);
  if (!nome || Number.isNaN(valorUnitario)) {
    return NextResponse.json({ error: "Nome e valor unitário são obrigatórios" }, { status: 400 });
  }

  try {
    const servico = await prisma.servico.create({
      data: {
        nome,
        descricao: body.descricao ?? null,
        valorUnitario,
        unidade: body.unidade ?? "und",
      },
    });
    await audit({ tipoEntidade: "servico", entidadeId: servico.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: servico.nome });
    return NextResponse.json({ id: servico.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar serviço." }, { status: 500 });
  }
}
