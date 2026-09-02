import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { separarExigencias } from "@/lib/exigencias";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Geração manual de exigências + prazos para a fase do processo (a partir do
 * blocoExigenciaTemplate). Opcionalmente avança a fase do processo.
 * Body: { fase?: string } — se informada, atualiza a fase e gera as dela.
 */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const faseFinal = ((body.fase as string) ?? processo.fase)?.trim();
  if (!faseFinal) {
    return NextResponse.json({ error: "Processo sem fase. Defina a fase antes de gerar exigências." }, { status: 400 });
  }

  // Atualiza a fase se veio no body (botão "Avançar fase").
  if (body.fase && body.fase !== processo.fase) {
    await prisma.processo.update({ where: { id: processoId }, data: { fase: faseFinal } });
  }

  const blocos = await prisma.blocoExigenciaTemplate.findMany({
    where: { fase: faseFinal, ativo: true },
    orderBy: { ordem: "asc" },
  });

  let criados = 0;
  for (const bloco of blocos) {
    const prazoResposta = new Date();
    prazoResposta.setDate(prazoResposta.getDate() + bloco.prazoDias);

    for (const parte of separarExigencias(bloco.nome, bloco.descricao)) {
      // Dedup por parte (evita duplicar "CFEM" e "PFM" ao re-gerar).
      const jaExiste = await prisma.exigencia.findFirst({
        where: { processoId, descricao: { contains: `${parte.nome}:`, mode: "insensitive" } },
      });
      if (jaExiste) continue;

      const exigencia = await prisma.exigencia.create({
        data: {
          processoId,
          orgaoId: processo.orgaoId,
          descricao: parte.descricao ? `${parte.nome}: ${parte.descricao}` : parte.nome,
          prazoResposta,
          status: "pendente",
          responsavelPessoaId: bloco.responsavelPessoaId ?? null,
          observacoes: `Gerado automaticamente do bloco "${bloco.nome}" da fase ${faseFinal}`,
        },
      });
      await prisma.prazo.create({
        data: {
          processoId,
          exigenciaId: exigencia.id,
          descricao: parte.nome,
          quantidade: bloco.prazoDias,
          unidade: bloco.unidade,
          dataInicial: new Date(),
          dataCalculadaOriginal: prazoResposta,
          dataCalculadaAtual: prazoResposta,
          status: "futuro",
          responsavelPessoaId: bloco.responsavelPessoaId ?? null,
        },
      });
      criados++;
      await audit({ tipoEntidade: "exigencia", entidadeId: exigencia.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: parte.nome });
    }
  }

  return NextResponse.json({ ok: true, criados, fase: faseFinal });
}
