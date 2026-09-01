import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importarLicencaDoOrgao } from "@/lib/licenca";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const licenca = (req.nextUrl.searchParams.get("licenca") || "").trim();
  const protocolo = (req.nextUrl.searchParams.get("protocolo") || "").trim();
  const orgao = (req.nextUrl.searchParams.get("orgao") || "").trim();

  if (!licenca && !protocolo) {
    return NextResponse.json({ error: "Informe o número da licença ou do protocolo" }, { status: 400 });
  }

  try {
    const dados = await importarLicencaDoOrgao({
      licenca: licenca || undefined,
      protocolo: protocolo || undefined,
      orgaoSigla: orgao || undefined,
    });
    if (!dados) {
      return NextResponse.json({ error: "Nenhuma licença encontrada no IAT (SGA) ou IMA (SC)" }, { status: 404 });
    }
    return NextResponse.json(dados);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Falha na consulta: ${msg}` }, { status: 502 });
  }
}
