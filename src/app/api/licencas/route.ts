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
  const tipoLicencaId = body.tipoLicencaId ? Number(body.tipoLicencaId) : null;
  const orgaoId = body.orgaoId ? Number(body.orgaoId) : null;

  if (!numero || !tipoLicencaId || !orgaoId) {
    return NextResponse.json({ error: "Número, tipo e órgão são obrigatórios" }, { status: 400 });
  }

  try {
    const licenca = await prisma.licenca.create({
      data: {
        numero,
        tipoLicencaId,
        orgaoId,
        empreendimentoId: body.empreendimentoId ? Number(body.empreendimentoId) : null,
        dataEmissao: body.dataEmissao ? new Date(body.dataEmissao) : null,
        dataValidade: body.dataValidade ? new Date(body.dataValidade) : null,
        situacao: body.situacao ?? "ativa",
        observacoes: body.observacoes ?? null,
        responsavelPessoaId: body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null,
      },
    });
    await audit({
      tipoEntidade: "licenca",
      entidadeId: licenca.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: licenca.numero,
    });
    return NextResponse.json({ id: licenca.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar licença." }, { status: 500 });
  }
}
