import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { dataLocal } from "@/lib/format";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const faturas = await prisma.fatura.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
    include: { empresa: true, _count: { select: { itens: true } } },
  });
  return NextResponse.json(faturas);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const empresaId = Number(body.empresaId);
  const itens = Array.isArray(body.itens) ? body.itens : [];
  if (!empresaId) return NextResponse.json({ error: "Selecione o cliente" }, { status: 400 });
  if (itens.length === 0) return NextResponse.json({ error: "Adicione ao menos um item" }, { status: 400 });

  const itensCalc = itens.map((it: Record<string, unknown>) => {
    const qtde = Number(it.qtde ?? 0);
    const hora = Number(it.horaTecnica ?? 0);
    const pct = Number(it.descontoPct ?? 0);
    const outros = Number(it.outrosCustos ?? 0);
    const base = qtde * hora;
    const desc = round2(base * (Math.min(100, pct) / 100));
    const adm = round2((base - desc + outros) * 0.18);
    const tot = round2((base - desc + outros) * 1.18);
    return {
      data: (it.data as string) ? new Date(it.data as string) : null,
      identificacao: String(it.identificacao ?? ""),
      descricao: (it.descricao as string) || null,
      qtde,
      horaTecnica: hora,
      descontoPct: pct || null,
      descontoValor: desc,
      outrosCustos: outros,
      custosAdmFiscais: adm,
      total: tot,
    };
  });

  const ano = new Date().getFullYear();
  const count = await prisma.fatura.count({ where: { ano } });
  const numero = String(count + 1).padStart(3, "0");

  try {
    const fatura = await prisma.fatura.create({
      data: {
        numero,
        ano,
        empresaId,
        empreendimentoId: body.empreendimentoId ? Number(body.empreendimentoId) : null,
        referencia: body.referencia ?? null,
        periodo: body.periodo ?? null,
        vencimento: dataLocal(body.vencimento),
        status: "aberta",
        observacoes: body.observacoes ?? null,
        criadoPor: Number(session.user.id),
        itens: { create: itensCalc },
      },
      include: { itens: true },
    });
    await audit({ tipoEntidade: "fatura", entidadeId: fatura.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: `${numero}/${ano}` });
    return NextResponse.json({ id: fatura.id, numero, ano }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar fatura." }, { status: 500 });
  }
}
