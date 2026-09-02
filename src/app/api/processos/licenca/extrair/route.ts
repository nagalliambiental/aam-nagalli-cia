import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analisarLicenca } from "@/lib/extrair-licenca";

const EXTENSOES_OK = new Set(["pdf", "jpg", "jpeg", "png", "tiff", "tif", "bmp"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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
    const campos = await analisarLicenca(buffer, ext);

    if (!campos.numeroLicenca && !campos.numeroProtocolo && !campos.dataProtocolo && !campos.validade && !campos.atividade && !campos.modalidade && !campos.condicionantes) {
      return NextResponse.json(
        { error: "Não foi possível extrair dados da licença. Verifique se o arquivo está nítido/legível ou se a chave OCR está configurada." },
        { status: 422 }
      );
    }
    return NextResponse.json({ campos, fileName: file.name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro ao processar documento: ${msg}` }, { status: 500 });
  }
}
