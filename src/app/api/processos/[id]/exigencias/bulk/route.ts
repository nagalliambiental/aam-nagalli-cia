import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { separarExigencias } from "@/lib/exigencias";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:criar") && !session.user.permissoes?.includes("processo:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const drafts = (body.drafts as { nome?: string; descricao: string; prazoDias?: number; unidade?: string; responsavelPessoaId?: number | null }[]) ?? [];

  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: "Nenhuma exigência para criar" }, { status: 400 });
  }
  if (drafts.length > 20) return NextResponse.json({ error: "Máximo 20 exigências por vez" }, { status: 400 });

  const created: number[] = [];
  for (const d of drafts) {
    const descricao = (d.descricao ?? "").trim().slice(0, 2000);
    if (!descricao) continue;
    const nome = (d.nome ?? descricao.slice(0, 60)).trim();
    const prazoDias = d.prazoDias ? Number(d.prazoDias) : 30;
    const unidade = d.unidade ?? "corridos";
    const prazoResposta = new Date();
    prazoResposta.setDate(prazoResposta.getDate() + prazoDias);

    for (const parte of separarExigencias(nome, descricao)) {
      const exigencia = await prisma.exigencia.create({
        data: {
          processoId,
          orgaoId: processo.orgaoId,
          descricao: `${parte.nome}: ${parte.descricao}`.slice(0, 2000),
          prazoResposta,
          status: "pendente",
          responsavelPessoaId: d.responsavelPessoaId ? Number(d.responsavelPessoaId) : null,
          observacoes: "Gerado via PDF - revisado antes de criar",
        },
      });
      await prisma.prazo.create({
        data: {
          processoId,
          exigenciaId: exigencia.id,
          descricao: parte.nome.slice(0, 200),
          quantidade: prazoDias,
          unidade,
          dataInicial: new Date(),
          dataCalculadaOriginal: prazoResposta,
          dataCalculadaAtual: prazoResposta,
          status: "futuro",
          responsavelPessoaId: d.responsavelPessoaId ? Number(d.responsavelPessoaId) : null,
        },
      });
      await audit({ tipoEntidade: "exigencia", entidadeId: exigencia.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: parte.nome });
      created.push(exigencia.id);
    }
  }

  return NextResponse.json({ created }, { status: 201 });
}
