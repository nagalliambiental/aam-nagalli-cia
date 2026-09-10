import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { dataLocal } from "@/lib/format";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const titulo = ((body.titulo as string) ?? "").trim();
  const responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;
  const rawIds: unknown = (body as { processoIds?: unknown }).processoIds;
  const processoIds = Array.isArray(rawIds)
    ? [...new Set(rawIds.map((n) => Number(n)).filter((n) => Number.isInteger(n)))]
    : [];
  if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  if (!responsavelPessoaId) return NextResponse.json({ error: "Responsável é obrigatório" }, { status: 400 });
  if (processoIds.length === 0) return NextResponse.json({ error: "Selecione ao menos um processo" }, { status: 400 });

  const descricao = ((body.descricao as string) ?? "").trim();
  const observacoes = ((body.observacoes as string) ?? "").trim();
  const prazoData = dataLocal(body.prazoData);
  const dataLimite = dataLocal(body.dataLimite);
  const alertaDataLimite = body.alertaDataLimite != null && body.alertaDataLimite !== "" ? Number(body.alertaDataLimite) : null;
  const alertaDias = body.alertaDias != null && body.alertaDias !== "" ? Number(body.alertaDias) : 30;

  try {
    const processos = await prisma.processo.findMany({
      where: { id: { in: processoIds }, ativo: true, deletedAt: null },
    });
    if (processos.length === 0) return NextResponse.json({ error: "Nenhum processo válido selecionado" }, { status: 400 });

    let criadas = 0;
    for (const processo of processos) {
      const exigencia = await prisma.exigencia.create({
        data: {
          processoId: processo.id,
          orgaoId: processo.orgaoId,
          descricao: descricao ? `${titulo}: ${descricao}` : titulo,
          prazoResposta: prazoData,
          alertaDias,
          status: "pendente",
          responsavelPessoaId,
        },
      });
      const tarefa = await prisma.tarefa.create({
        data: {
          titulo,
          descricao,
          observacoes,
          processoId: processo.id,
          empreendimentoId: processo.empreendimentoId ?? null,
          exigenciaId: exigencia.id,
          responsavelPessoaId,
          prioridade: body.prioridade ?? "media",
          status: body.status ?? "nao_iniciado",
          prazoData,
          dataLimite,
          alertaDias,
          alertaDataLimite,
          visibilidade: body.visibilidade === "privado" ? "privado" : "publico",
          criadorUsuarioId: Number(session.user.id),
        },
      });
      await audit({ tipoEntidade: "tarefa", entidadeId: tarefa.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: `${titulo} · processo ${processo.numero}` });
      criadas++;
    }
    return NextResponse.json({ criadas }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar tarefas em massa." }, { status: 500 });
  }
}
