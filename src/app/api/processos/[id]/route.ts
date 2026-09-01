import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:editar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const processoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!existing) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("numero" in body) data.numero = body.numero;
  if ("nup" in body) {
    const nup = body.nup ? String(body.nup).trim() || null : null;
    if (nup && !/^48\d{3}\.\d{6}\/\d{4}-\d{2}$/.test(nup)) {
      return NextResponse.json({ error: "NUP inválido. Formato esperado: 48xxx.000000/AAAA-DV" }, { status: 400 });
    }
    data.nup = nup;
  }
  if ("orgaoId" in body) data.orgaoId = Number(body.orgaoId);
  if ("tipoProcessoId" in body) data.tipoProcessoId = Number(body.tipoProcessoId);
  if ("empreendimentoId" in body) data.empreendimentoId = body.empreendimentoId ? Number(body.empreendimentoId) : null;
  if ("assunto" in body) data.assunto = body.assunto ?? null;
  if ("fase" in body) data.fase = body.fase ?? null;
  if ("status" in body) data.status = body.status;
  if ("areaValor" in body) data.areaValor = body.areaValor != null ? Number(body.areaValor) : null;
  if ("areaUnidade" in body) data.areaUnidade = body.areaUnidade ?? "ha";
  if ("substancias" in body) data.substancias = body.substancias ?? null;
  if ("dataAbertura" in body) data.dataAbertura = body.dataAbertura ? new Date(body.dataAbertura) : null;
  if ("descricao" in body) data.descricao = body.descricao ?? null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;

  try {
    const processo = await prisma.processo.update({ where: { id: processoId }, data: data as never });

    // Geração automática de exigências + prazos ao mudar de fase (sem RegraPrazo)
    const faseAntiga = existing.fase as string | null;
    const faseNova = (body.fase as string | null) ?? (existing.fase as string | null);
    if (faseNova && faseNova !== faseAntiga) {
      const blocos = await prisma.blocoExigenciaTemplate.findMany({
        where: { fase: faseNova, ativo: true },
        orderBy: { ordem: "asc" },
      });
      for (const bloco of blocos) {
        // evita duplicar bloco já gerado para este processo
        const jaExiste = await prisma.exigencia.findFirst({
          where: { processoId, descricao: { contains: bloco.nome, mode: "insensitive" } },
        });
        if (jaExiste) continue;

        const prazoResposta = new Date();
        prazoResposta.setDate(prazoResposta.getDate() + bloco.prazoDias);

        const exigencia = await prisma.exigencia.create({
          data: {
            processoId,
            orgaoId: processo.orgaoId,
            descricao: `${bloco.nome}: ${bloco.descricao}`,
            prazoResposta,
            status: "pendente",
            responsavelPessoaId: bloco.responsavelPessoaId ?? null,
            observacoes: `Gerado automaticamente do bloco "${bloco.nome}" da fase ${faseNova}`,
          },
        });

        await prisma.prazo.create({
          data: {
            processoId,
            exigenciaId: exigencia.id,
            descricao: bloco.nome,
            quantidade: bloco.prazoDias,
            unidade: bloco.unidade,
            dataInicial: new Date(),
            dataCalculadaOriginal: prazoResposta,
            dataCalculadaAtual: prazoResposta,
            status: "futuro",
            responsavelPessoaId: bloco.responsavelPessoaId ?? null,
          },
        });
      }
    }

    await audit({ tipoEntidade: "processo", entidadeId: processo.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: processo.id });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:excluir")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  await prisma.processo.update({ where: { id: Number(id) }, data: { ativo: false, deletedAt: new Date() } });
  await audit({ tipoEntidade: "processo", entidadeId: Number(id), acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
