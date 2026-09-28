import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Corpo máximo aceito pela função serverless da Vercel (~4,5 MB).
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

async function acharTarefa(tarefaId: number, isAdmin: boolean) {
  return prisma.tarefa.findFirst({
    where: { id: tarefaId, ativo: true, deletedAt: null, ...(isAdmin ? {} : { visibilidade: "publico" }) },
    select: { id: true, titulo: true },
  });
}

function metado(anexo: { id: number; nome: string; mime: string; tamanho: number; criadoEm: Date }) {
  return { id: anexo.id, nome: anexo.nome, mime: anexo.mime, tamanho: anexo.tamanho, criadoEm: anexo.criadoEm };
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const tarefaId = Number(id);
  const isAdmin = session.user.perfilNome === "Administrador";
  const tarefa = await acharTarefa(tarefaId, isAdmin);
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const anexos = await prisma.tarefaAnexo.findMany({
    where: { tarefaId },
    orderBy: { criadoEm: "desc" },
    select: { id: true, nome: true, mime: true, tamanho: true, criadoEm: true },
  });

  return NextResponse.json({ anexos: anexos.map(metado) });
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const tarefaId = Number(id);
  const isAdmin = session.user.perfilNome === "Administrador";
  const tarefa = await acharTarefa(tarefaId, isAdmin);
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  const file = formData.get("arquivo") as File | null;
  if (!file || typeof file === "string") return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
  if (file.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ error: "Arquivo acima do limite de 4 MB." }, { status: 413 });
  }

  const conteudo = Buffer.from(await file.arrayBuffer());
  const nome = file.name || "arquivo";

  try {
    const anexo = await prisma.tarefaAnexo.create({
      data: {
        tarefaId,
        nome,
        mime: file.type || "application/octet-stream",
        tamanho: file.size,
        conteudo,
        criadoPor: Number(session.user.id),
      },
      select: { id: true, nome: true, mime: true, tamanho: true, criadoEm: true },
    });

    await audit({
      tipoEntidade: "tarefa",
      entidadeId: tarefaId,
      acao: "criar",
      campo: "anexo",
      valorNovo: nome,
      usuarioId: Number(session.user.id),
    });

    return NextResponse.json({ anexo: metado(anexo) });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar o anexo." }, { status: 500 });
  }
}
