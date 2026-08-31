import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const numero = (body.numero as string) ?? "";
  const tipoTituloId = body.tipoTituloId ? Number(body.tipoTituloId) : null;
  const orgaoId = body.orgaoId ? Number(body.orgaoId) : null;
  const processoId = body.processoId ? Number(body.processoId) : null;

  if (!numero || !tipoTituloId || !orgaoId || !processoId) {
    return NextResponse.json(
      { error: "Número, tipo, órgão e processo de origem são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const titulo = await prisma.$transaction(async (tx) => {
      const novo = await tx.tituloMinerario.create({
        data: {
          numero,
          tipoTituloId,
          orgaoId,
          substancia: body.substancia ?? null,
          municipio: body.municipio ?? null,
          uf: body.uf ?? null,
          dataEmissao: body.dataEmissao ? new Date(body.dataEmissao) : null,
          validade: body.validade ? new Date(body.validade) : null,
          situacao: body.situacao ?? "ativo",
          observacoes: body.observacoes ?? null,
          responsavelPessoaId: body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null,
        },
      });
      await tx.tituloProcesso.create({
        data: { tituloId: novo.id, processoId },
      });
      return novo;
    });
    await audit({
      tipoEntidade: "titulo",
      entidadeId: titulo.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: titulo.numero,
    });
    return NextResponse.json({ id: titulo.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar título." }, { status: 500 });
  }
}
