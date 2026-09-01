import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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
    const mod = await import("pdf-parse");
    const pdf =
      (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ??
      (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
    const data = await pdf(buf);
    text = data.text ?? "";
  } catch {
    text = "";
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Não foi possível extrair texto do PDF. Verifique se é um PDF com texto selecionável." },
      { status: 422 }
    );
  }

  return NextResponse.json({ texto: text.trim(), fileName: file.name });
}
