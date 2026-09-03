import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const pedidos = await prisma.pedido.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { data: "desc" },
    include: { empresa: true, _count: { select: { itens: true } } },
  });
  return NextResponse.json(pedidos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("custo:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const empresaId = Number(body.empresaId);
  const itens = Array.isArray(body.itens) ? body.itens : [];
  if (!empresaId) return NextResponse.json({ error: "Selecione o cliente" }, { status: 400 });
  if (itens.length === 0) return NextResponse.json({ error: "Adicione ao menos um item" }, { status: 400 });

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  // Calcula totais no servidor (valor por linha, subtotal, desconto, total).
  const itensCalc = itens.map((it: { servicoId?: number; descricao?: string; unidade?: string; quantidade?: number; valorUnitario?: number }) => {
    const quantidade = Number(it.quantidade ?? 0);
    const valorUnitario = Number(it.valorUnitario ?? 0);
    const total = round2(quantidade * valorUnitario);
    return {
      servicoId: it.servicoId ? Number(it.servicoId) : null,
      descricao: (it.descricao as string) || "Serviço",
      unidade: it.unidade || "und",
      quantidade,
      valorUnitario,
      total,
    };
  });
  const subtotal = round2(itensCalc.reduce((s: number, i: { total: number }) => s + i.total, 0));

  const descontoTipo = body.descontoTipo === "percentual" || body.descontoTipo === "valor" ? body.descontoTipo : null;
  const descontoValor = body.descontoValor != null && body.descontoValor !== "" ? Number(body.descontoValor) : 0;
  const desconto = descontoTipo === "percentual"
    ? round2(subtotal * (Math.min(100, descontoValor) / 100))
    : descontoTipo === "valor"
      ? Math.min(descontoValor, subtotal)
      : 0;
  const total = round2(subtotal - desconto);

  const ano = new Date().getFullYear();
  const count = await prisma.pedido.count({ where: { numero: { startsWith: `${ano}/` } } });
  const numero = `${ano}/${String(count + 1).padStart(4, "0")}`;

  try {
    const pedido = await prisma.pedido.create({
      data: {
        numero,
        empresaId,
        data: new Date(),
        status: "aberto",
        descontoTipo,
        descontoValor: desconto || null,
        subtotal,
        total,
        observacoes: body.observacoes ?? null,
        criadoPor: Number(session.user.id),
        itens: { create: itensCalc },
      },
      include: { itens: true },
    });
    await audit({ tipoEntidade: "pedido", entidadeId: pedido.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: numero });
    return NextResponse.json({ id: pedido.id, numero }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar pedido." }, { status: 500 });
  }
}
