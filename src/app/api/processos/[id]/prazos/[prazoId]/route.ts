import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string; prazoId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("prazo:editar") && !session.user.permissoes?.includes("processo:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { prazoId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("descricao" in body) data.descricao = body.descricao;
  if ("status" in body) data.status = body.status;
  if ("dataCalculadaAtual" in body) data.dataCalculadaAtual = body.dataCalculadaAtual ? new Date(body.dataCalculadaAtual) : null;
  if ("dataEfetiva" in body) data.dataEfetiva = body.dataEfetiva ? new Date(body.dataEfetiva) : null;
  if ("alertaDias" in body) data.alertaDias = body.alertaDias != null ? Number(body.alertaDias) : null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;
  if ("responsavelPessoaId" in body) data.responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;

  try {
    const prazo = await prisma.prazo.update({ where: { id: Number(prazoId) }, data: data as never });
    await prisma.prazoMovimentacao.create({
      data: { prazoId: prazo.id, tipo: "alterado_manual", novaDataCalculada: prazo.dataCalculadaAtual, usuarioId: Number(session.user.id) },
    });
    await audit({ tipoEntidade: "prazo", entidadeId: prazo.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: prazo.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar prazo." }, { status: 500 });
  }
}
