import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extrairTarefasDePdf } from "@/lib/tarefas-pdf";

const EXTENSOES_OK = new Set(["pdf", "jpg", "jpeg", "png", "tiff", "tif", "bmp"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo PDF/imagem obrigatório" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!EXTENSOES_OK.has(ext)) {
    return NextResponse.json({ error: "Formato não suportado. Envie PDF, JPG, PNG, TIFF ou BMP." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const itens = await extrairTarefasDePdf(buffer, ext);
    if (itens.length === 0) {
      return NextResponse.json({ error: "Nenhuma tarefa identificada no documento." }, { status: 422 });
    }
    return NextResponse.json({ itens });
  } catch {
    return NextResponse.json({ error: "Erro ao ler o documento." }, { status: 500 });
  }
}
