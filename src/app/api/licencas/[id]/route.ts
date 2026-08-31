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
  if (!session.user.permissoes?.includes("cadastro:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const licencaId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  const str = ["numero", "situacao", "observacoes"] as const;
  for (const c of str) {
    if (c in body) data[c] = body[c] ?? null;
  }
  if ("tipoLicencaId" in body) data.tipoLicencaId = Number(body.tipoLicencaId);
  if ("orgaoId" in body) data.orgaoId = Number(body.orgaoId);
  if ("empreendimentoId" in body)
    data.empreendimentoId = body.empreendimentoId ? Number(body.empreendimentoId) : null;
  if ("responsavelPessoaId" in body)
    data.responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;
  if ("dataEmissao" in body) data.dataEmissao = body.dataEmissao ? new Date(body.dataEmissao) : null;
  if ("dataValidade" in body) data.dataValidade = body.dataValidade ? new Date(body.dataValidade) : null;

  try {
    const licenca = await prisma.licenca.update({ where: { id: licencaId }, data: data as never });
    await audit({
      tipoEntidade: "licenca",
      entidadeId: licenca.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: licenca.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.licenca.update({
    where: { id: Number(id) },
    data: { ativo: false, deletedAt: new Date() },
  });
  await audit({
    tipoEntidade: "licenca",
    entidadeId: Number(id),
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });
  return NextResponse.json({ ok: true });
}
