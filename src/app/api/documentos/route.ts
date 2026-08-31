import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { put } from "@vercel/blob";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("documento:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Armazenamento não configurado (BLOB_READ_WRITE_TOKEN ausente)." },
      { status: 501 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulário inválido" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
  }

  const tipo = String(form.get("tipo") ?? "outro");
  const categoria = String(form.get("categoria") ?? "documento");
  const observacoes = String(form.get("observacoes") ?? "") || null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  try {
    const blob = await put(`${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });

    const documento = await prisma.documento.create({
      data: {
        nome: file.name,
        tipo,
        categoria,
        storageKey: blob.url,
        mime: file.type || null,
        tamanho: file.size,
        hash,
        origem: "upload",
        observacoes,
        criadoPor: Number(session.user.id),
        status: "ativo",
      },
    });

    await audit({
      tipoEntidade: "documento",
      entidadeId: documento.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: file.name,
    });

    return NextResponse.json({ id: documento.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao enviar documento." }, { status: 500 });
  }
}
