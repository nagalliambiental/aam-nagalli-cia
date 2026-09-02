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
  const titulo = (body.titulo as string) ?? "";
  const responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;
  const processoId = body.processoId ? Number(body.processoId) : null;
  const empreendimentoId = body.empreendimentoId ? Number(body.empreendimentoId) : null;
  if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  if (!responsavelPessoaId) return NextResponse.json({ error: "Responsável é obrigatório" }, { status: 400 });

  const processo = processoId ? await prisma.processo.findUnique({ where: { id: processoId } }) : null;
  if (processoId && !processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  try {
    const descricao = (body.descricao as string ?? "").trim();
    const observacoes = (body.observacoes as string ?? "").trim();
    const prazoData = dataLocal(body.prazoData);
    const alertaDias = body.alertaDias != null ? Number(body.alertaDias) : 30;

    // Cria a exigência vinculada ao processo (mesmo prazo e alerta) apenas se houver processo.
    let exigenciaId: number | null = null;
    if (processo) {
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
      exigenciaId = exigencia.id;
    }

    const tarefa = await prisma.tarefa.create({
      data: {
        titulo,
        descricao,
        observacoes,
        processoId: processo?.id ?? null,
        empreendimentoId,
        exigenciaId,
        responsavelPessoaId,
        prioridade: body.prioridade ?? "media",
        status: "pendente",
        prazoData,
        alertaDias,
        criadorUsuarioId: Number(session.user.id),
      },
    });

    await audit({ tipoEntidade: "tarefa", entidadeId: tarefa.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: titulo });

    return NextResponse.json({ id: tarefa.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar tarefa." }, { status: 500 });
  }
}
