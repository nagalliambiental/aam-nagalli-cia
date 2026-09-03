import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { dataLocal } from "@/lib/format";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("custo:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const descricao = (body.descricao as string) ?? "";
  const valor = Number(body.valor);
  if (!descricao || Number.isNaN(valor)) {
    return NextResponse.json({ error: "Descrição e valor são obrigatórios" }, { status: 400 });
  }

  const processoId = body.processoId ? Number(body.processoId) : null;
  if (processoId) {
    const processo = await prisma.processo.findUnique({ where: { id: processoId } });
    if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  try {
    const custo = await prisma.custo.create({
      data: {
        processoId,
        tipo: body.tipo ?? "outro",
        descricao,
        valor,
        data: dataLocal(body.data) ?? new Date(),
        fornecedor: body.fornecedor ?? null,
        status: body.status ?? "pendente",
        observacoes: body.observacoes ?? null,
        responsavelPessoaId: body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null,
        criadoPor: Number(session.user.id),
      },
    });

    await audit({ tipoEntidade: "custo", entidadeId: custo.id, acao: "criar", usuarioId: Number(session.user.id) });

    return NextResponse.json({ id: custo.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar custo." }, { status: 500 });
  }
}
