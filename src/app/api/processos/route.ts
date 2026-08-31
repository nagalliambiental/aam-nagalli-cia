import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("processo:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const numero = (body.numero as string) ?? "";
  if (!numero) {
    return NextResponse.json({ error: "Número é obrigatório" }, { status: 400 });
  }

  const nup = body.nup ? String(body.nup).replace(/\s/g, "").trim() || null : null;
  if (nup && !/^48\d{3}\.\d{6}\/\d{4}-\d{2}$/.test(nup)) {
    return NextResponse.json({ error: "NUP inválido. Formato esperado: 48xxx.000000/AAAA-DV" }, { status: 400 });
  }

  try {
    const processo = await prisma.processo.create({
      data: {
        numero,
        nup,
        orgaoId: body.orgaoId,
        tipoProcessoId: body.tipoProcessoId,
        empreendimentoId: body.empreendimentoId ?? null,
        assunto: body.assunto ?? null,
        fase: body.fase ?? null,
        status: body.status ?? "em_andamento",
        dataAbertura: body.dataAbertura ? new Date(body.dataAbertura) : new Date(),
        descricao: body.descricao ?? null,
        observacoes: body.observacoes ?? null,
      },
    });

    await audit({
      tipoEntidade: "processo",
      entidadeId: processo.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: processo.numero,
    });

    // Geração automática de blocos da fase inicial (sem RegraPrazo)
    if (processo.fase) {
      const blocos = await prisma.blocoExigenciaTemplate.findMany({
        where: { fase: processo.fase as string, ativo: true },
        orderBy: { ordem: "asc" },
      });
      for (const bloco of blocos) {
        const prazoResposta = new Date();
        prazoResposta.setDate(prazoResposta.getDate() + bloco.prazoDias);
        const exigencia = await prisma.exigencia.create({
          data: {
            processoId: processo.id,
            orgaoId: processo.orgaoId,
            descricao: `${bloco.nome}: ${bloco.descricao}`,
            prazoResposta,
            status: "pendente",
            responsavelPessoaId: bloco.responsavelPessoaId ?? null,
            observacoes: `Gerado automaticamente do bloco "${bloco.nome}" da fase ${processo.fase}`,
          },
        });
        await prisma.prazo.create({
          data: {
            processoId: processo.id,
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

    return NextResponse.json({ id: processo.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar processo." }, { status: 500 });
  }
}
