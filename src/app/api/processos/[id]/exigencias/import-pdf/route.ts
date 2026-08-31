import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo PDF obrigatório" }, { status: 400 });

  // Extração de texto do PDF - MVP: usa nome do arquivo; futuramente integrar pdf-parse ou IA
  const text = `Exigência extraída do PDF: ${file.name} (${Math.round(file.size / 1024)} KB) - revise a descrição e o prazo antes de acompanhar`;

  // Gera rascunhos: quebra por linhas relevantes (filtra linhas com mais de 15 chars)
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 15);
  // se muitas linhas, pega até 10 mais relevantes; senão usa o texto inteiro como 1 rascunho
  const drafts = rawLines.length > 3 ? rawLines.slice(0, 10) : [text.slice(0, 500)];

  // Cria exigências em rascunho (status pendente) + prazos
  const created: number[] = [];
  for (const draft of drafts) {
    const descricao = draft.slice(0, 500);
    const prazoResposta = new Date();
    prazoResposta.setDate(prazoResposta.getDate() + 30);
    const exigencia = await prisma.exigencia.create({
      data: {
        processoId,
        orgaoId: processo.orgaoId,
        descricao,
        prazoResposta,
        status: "pendente",
        observacoes: `Gerado via PDF "${file.name}" - revisar antes de acompanhar`,
      },
    });
    await prisma.prazo.create({
      data: {
        processoId,
        exigenciaId: exigencia.id,
        descricao: `Prazo exigência PDF: ${descricao.slice(0, 80)}`,
        quantidade: 30,
        unidade: "corridos",
        dataInicial: new Date(),
        dataCalculadaOriginal: prazoResposta,
        dataCalculadaAtual: prazoResposta,
        status: "futuro",
      },
    });
    created.push(exigencia.id);
  }

  return NextResponse.json({ created, drafts }, { status: 201 });
}
