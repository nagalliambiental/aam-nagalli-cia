import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ anexoId: string }> };

// Só tipos seguros para exibir dentro do navegador; os demais baixam.
function podeExibirInline(mime: string) {
  return mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/plain");
}

function contentDisposition(nome: string, inline: boolean) {
  const ascii = nome.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

async function acharAnexo(anexoId: number, isAdmin: boolean) {
  return prisma.tarefaAnexo.findFirst({
    where: { id: anexoId, tarefa: { ativo: true, deletedAt: null, ...(isAdmin ? {} : { visibilidade: "publico" }) } },
    select: { id: true, nome: true, mime: true, tamanho: true, conteudo: true, tarefaId: true },
  });
}

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { anexoId } = await params;
  const id = Number(anexoId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Anexo inválido" }, { status: 400 });

  const isAdmin = session.user.perfilNome === "Administrador";
  const anexo = await acharAnexo(id, isAdmin);
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  const url = new URL(req.url);
  const querInline = url.searchParams.get("disposicao") === "inline";
  const inline = querInline && podeExibirInline(anexo.mime);

  return new NextResponse(Buffer.from(anexo.conteudo), {
    headers: {
      "Content-Type": anexo.mime,
      "Content-Length": String(anexo.tamanho),
      "Content-Disposition": contentDisposition(anexo.nome, inline),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { anexoId } = await params;
  const id = Number(anexoId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Anexo inválido" }, { status: 400 });

  const isAdmin = session.user.perfilNome === "Administrador";
  const anexo = await acharAnexo(id, isAdmin);
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  try {
    await prisma.tarefaAnexo.delete({ where: { id } });
    await audit({
      tipoEntidade: "tarefa",
      entidadeId: anexo.tarefaId,
      acao: "excluir",
      campo: "anexo",
      valorAnterior: anexo.nome,
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir o anexo." }, { status: 500 });
  }
}
