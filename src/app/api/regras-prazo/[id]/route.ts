import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("config:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const regraId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  const str = ["fase", "condicao", "unidade", "acaoGerada", "tarefaGerada"] as const;
  for (const c of str) {
    if (c in body) data[c] = body[c] ?? null;
  }
  if ("orgaoId" in body) data.orgaoId = Number(body.orgaoId);
  if ("tipoProcessoId" in body) data.tipoProcessoId = body.tipoProcessoId ? Number(body.tipoProcessoId) : null;
  if ("tipoEventoId" in body) data.tipoEventoId = body.tipoEventoId ? Number(body.tipoEventoId) : null;
  if ("tipoTituloId" in body) data.tipoTituloId = body.tipoTituloId ? Number(body.tipoTituloId) : null;
  if ("tipoLicencaId" in body) data.tipoLicencaId = body.tipoLicencaId ? Number(body.tipoLicencaId) : null;
  if ("quantidade" in body) data.quantidade = Number(body.quantidade);
  if ("antecedenciaNotificacao" in body) data.antecedenciaNotificacao = body.antecedenciaNotificacao != null ? Number(body.antecedenciaNotificacao) : null;
  if ("ativo" in body) data.ativo = Boolean(body.ativo);
  if ("dataFixa" in body) data.dataFixa = body.dataFixa ? new Date(body.dataFixa) : null;
  if ("vigenciaFim" in body) data.vigenciaFim = body.vigenciaFim ? new Date(body.vigenciaFim) : null;

  try {
    const regra = await prisma.regraPrazo.update({ where: { id: regraId }, data: data as never });
    await audit({
      tipoEntidade: "regra_prazo",
      entidadeId: regra.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: regra.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("config:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.regraPrazo.update({
    where: { id: Number(id) },
    data: { ativo: false },
  });
  await audit({
    tipoEntidade: "regra_prazo",
    entidadeId: Number(id),
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });
  return NextResponse.json({ ok: true });
}
