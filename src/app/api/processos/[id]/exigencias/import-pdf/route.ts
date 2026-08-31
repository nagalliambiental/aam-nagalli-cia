import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

function parseExigencias(text: string) {
  const normalized = text.replace(/\r/g, " ").replace(/\s+/g, " ").trim();
  // tenta quebrar por marcadores comuns de ofício ANM
  const chunks: string[] = [];
  // quebra por numeração tipo "1." "2 -" "a)" ou por "Exigência"
  const parts = normalized.split(/(?=\bExig[êe]ncia\b)|(?=\b\d+\s*[\.\)\-]\s)|(?=\b[Aa]\)\s)/i);
  for (const p of parts) {
    const t = p.trim();
    if (t.length < 20) continue;
    if (/exig|apresentar|comprovar|juntar|protocolar|regularizar|requerer/i.test(t)) {
      chunks.push(t.slice(0, 800));
    }
  }
  // fallback: se não achou padrão, quebra por frases longas
  if (chunks.length === 0) {
    const sentences = normalized.split(/(?<=\.)\s+/);
    for (const s of sentences) {
      if (s.length > 30 && s.length < 800) chunks.push(s.trim());
      if (chunks.length >= 8) break;
    }
  }
  // limita a 10 rascunhos
  return chunks.slice(0, 10).map((descricao) => {
    const m = descricao.match(/(\d+)\s*(dias?|meses?)/i);
    let prazoDias = 30;
    if (m) {
      const n = Number(m[1]);
      const unidade = m[2].toLowerCase();
      prazoDias = unidade.startsWith("mes") ? n * 30 : n;
      if (prazoDias < 1) prazoDias = 1;
      if (prazoDias > 365) prazoDias = 365;
    }
    const nome = descricao.slice(0, 60).split(/\.|\n/)[0].trim() || "Exigência do ofício";
    return { nome, descricao: descricao.slice(0, 800), prazoDias, unidade: "corridos" as const };
  });
}

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
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Envie um arquivo PDF" }, { status: 400 });
  }

  let text = "";
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    // pdf-parse é CJS: import dinâmico
    const mod = await import("pdf-parse");
    const pdf = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
    const data = await pdf(buf);
    text = data.text ?? "";
  } catch {
    text = "";
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Não foi possível extrair texto do PDF. Verifique se é um PDF com texto selecionável." }, { status: 422 });
  }

  const drafts = parseExigencias(text);
  if (drafts.length === 0) {
    // fallback: 1 rascunho com trecho inicial
    drafts.push({
      nome: `Ofício ${file.name}`,
      descricao: text.slice(0, 800),
      prazoDias: 30,
      unidade: "corridos",
    });
  }

  // Não cria no banco ainda — retorna rascunhos para edição antes de confirmar
  return NextResponse.json({ drafts, fileName: file.name, textPreview: text.slice(0, 2000) });
}
