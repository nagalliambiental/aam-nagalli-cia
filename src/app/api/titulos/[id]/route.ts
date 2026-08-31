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
  const tituloId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  const str = ["numero", "substancia", "municipio", "uf", "situacao", "observacoes"] as const;
  for (const c of str) {
    if (c in body) data[c] = body[c] ?? null;
  }
  if ("tipoTituloId" in body) data.tipoTituloId = Number(body.tipoTituloId);
  if ("orgaoId" in body) data.orgaoId = Number(body.orgaoId);
  if ("responsavelPessoaId" in body)
    data.responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;
  if ("dataEmissao" in body) data.dataEmissao = body.dataEmissao ? new Date(body.dataEmissao) : null;
  if ("validade" in body) data.validade = body.validade ? new Date(body.validade) : null;

  try {
    const titulo = await prisma.tituloMinerario.update({
      where: { id: tituloId },
      data: data as never,
    });

    if (body.processoId) {
      const processoId = Number(body.processoId);
      const vinc = await prisma.tituloProcesso.findFirst({ where: { tituloId } });
      if (vinc) {
        await prisma.tituloProcesso.update({
          where: { id: vinc.id },
          data: { processoId },
        });
      } else {
        await prisma.tituloProcesso.create({ data: { tituloId, processoId } });
      }
    }

    await audit({
      tipoEntidade: "titulo",
      entidadeId: titulo.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: titulo.id });
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
  await prisma.tituloMinerario.update({
    where: { id: Number(id) },
    data: { ativo: false, deletedAt: new Date() },
  });
  await audit({
    tipoEntidade: "titulo",
    entidadeId: Number(id),
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });
  return NextResponse.json({ ok: true });
}
