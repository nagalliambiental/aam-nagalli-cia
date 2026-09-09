import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { dataLocal } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  const fatura = await prisma.fatura.findFirst({
    where: { id: Number(id), ativo: true, deletedAt: null },
    include: { empresa: true, empreendimento: true, itens: { orderBy: { id: "asc" } } },
  });
  if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
  return NextResponse.json(fatura);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const idNumber = Number(id);
    const hasItems = Array.isArray(body.itens);
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const itensCalc = hasItems ? body.itens.map((it: Record<string, unknown>) => {
      const qtde = Number(it.qtde ?? 0);
      const hora = Number(it.horaTecnica ?? 0);
      const pct = Number(it.descontoPct ?? 0);
      const outros = Number(it.outrosCustos ?? 0);
      const base = qtde * hora;
      const desc = round2(base * (Math.min(100, pct) / 100));
      const adm = round2((base - desc + outros) * 0.18);
      return { data: (it.data as string) ? new Date(it.data as string) : null, identificacao: String(it.identificacao ?? ""), descricao: (it.descricao as string) || null, qtde, horaTecnica: hora, descontoPct: pct || null, descontoValor: desc, outrosCustos: outros, custosAdmFiscais: adm, total: round2((base - desc + outros) * 1.18) };
    }) : [];
    const fatura = await prisma.$transaction(async (tx) => {
      const updated = await tx.fatura.update({
        where: { id: idNumber },
        data: {
          ...(body.empresaId ? { empresaId: Number(body.empresaId) } : {}),
          ...(body.empreendimentoId !== undefined ? { empreendimentoId: body.empreendimentoId ? Number(body.empreendimentoId) : null } : {}),
          ...(body.referencia !== undefined ? { referencia: body.referencia || null } : {}),
          ...(body.periodoInicio !== undefined ? { periodoInicio: dataLocal(body.periodoInicio), periodoFim: dataLocal(body.periodoFim), periodo: body.periodoInicio && body.periodoFim ? `${dataLocal(body.periodoInicio)?.toLocaleDateString("pt-BR")} a ${dataLocal(body.periodoFim)?.toLocaleDateString("pt-BR")}` : null } : {}),
          ...(body.vencimento !== undefined ? { vencimento: dataLocal(body.vencimento) } : {}),
          ...(body.status ? { status: body.status } : {}),
          ...(body.recebido === true ? { recebidoEm: new Date(), recebidoPor: Number(session.user.id), status: "paga" } : {}),
          ...(body.recebido === false ? { recebidoEm: null, recebidoPor: null, status: body.status ?? "enviada" } : {}),
          ...(body.observacoes !== undefined ? { observacoes: body.observacoes ?? null } : {}),
        },
      });
      if (hasItems) {
        await tx.faturaItem.deleteMany({ where: { faturaId: idNumber } });
        await tx.faturaItem.createMany({ data: itensCalc.map((item: Record<string, unknown>) => ({ ...item, faturaId: idNumber })) as never });
      }
      return updated;
    });
    await audit({
      tipoEntidade: "fatura",
      entidadeId: fatura.id,
      acao: body.recebido === true ? "receber" : body.recebido === false ? "desfazer_recebimento" : "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: fatura.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar fatura." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.fatura.update({ where: { id: Number(id) }, data: { ativo: false, deletedAt: new Date() } });
  await audit({ tipoEntidade: "fatura", entidadeId: Number(id), acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
