import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("config:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const orgaoId = Number(body.orgaoId);
  if (!orgaoId) {
    return NextResponse.json({ error: "Órgão é obrigatório" }, { status: 400 });
  }

  try {
    const regra = await prisma.regraPrazo.create({
      data: {
        orgaoId,
        tipoProcessoId: body.tipoProcessoId ? Number(body.tipoProcessoId) : null,
        tipoEventoId: body.tipoEventoId ? Number(body.tipoEventoId) : null,
        tipoTituloId: body.tipoTituloId ? Number(body.tipoTituloId) : null,
        tipoLicencaId: body.tipoLicencaId ? Number(body.tipoLicencaId) : null,
        fase: body.fase ?? null,
        condicao: body.condicao ?? null,
        quantidade: body.quantidade != null ? Number(body.quantidade) : 0,
        unidade: body.unidade ?? "corridos",
        dataFixa: body.dataFixa ? new Date(body.dataFixa) : null,
        acaoGerada: body.acaoGerada ?? null,
        tarefaGerada: body.tarefaGerada ?? null,
        antecedenciaNotificacao: body.antecedenciaNotificacao != null ? Number(body.antecedenciaNotificacao) : null,
        ativo: body.ativo ?? true,
        vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null,
      },
    });

    await audit({
      tipoEntidade: "regra_prazo",
      entidadeId: regra.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
    });

    return NextResponse.json({ id: regra.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar regra." }, { status: 500 });
  }
}
