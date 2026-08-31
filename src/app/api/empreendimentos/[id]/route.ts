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
  const empreendimentoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("nome" in body) data.nome = body.nome;
  if ("tipo" in body) data.tipo = body.tipo ?? null;
  if ("municipio" in body) data.municipio = body.municipio ?? null;
  if ("uf" in body) data.uf = body.uf ?? null;
  if ("endereco" in body) data.endereco = body.endereco ?? null;
  if ("status" in body) data.status = body.status ?? "ativo";
  if ("descricao" in body) data.descricao = body.descricao ?? null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;
  if ("empresaPrincipalId" in body) data.empresaPrincipalId = Number(body.empresaPrincipalId);

  try {
    const emp = await prisma.empreendimento.update({
      where: { id: empreendimentoId },
      data: data as never,
    });

    // Mantém o vínculo principal coerente ao trocar a empresa principal
    if (data.empresaPrincipalId) {
      await prisma.empreendimentoEmpresa.upsert({
        where: {
          empreendimentoId_empresaId_papel: {
            empreendimentoId,
            empresaId: data.empresaPrincipalId as number,
            papel: "operador",
          },
        },
        update: { principal: true },
        create: {
          empreendimentoId,
          empresaId: data.empresaPrincipalId as number,
          papel: "operador",
          principal: true,
        },
      });
    }

    await audit({
      tipoEntidade: "empreendimento",
      entidadeId: emp.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: emp.id });
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
  await prisma.empreendimento.update({
    where: { id: Number(id) },
    data: { ativo: false, deletedAt: new Date() },
  });
  await audit({
    tipoEntidade: "empreendimento",
    entidadeId: Number(id),
    acao: "excluir",
    usuarioId: Number(session.user.id),
  });
  return NextResponse.json({ ok: true });
}
