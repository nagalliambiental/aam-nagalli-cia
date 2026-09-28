import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { relatorioPdfResponse } from "@/lib/relatorio-arquivos";
import { buscarRelatorioGerencial, RelatorioGerencialTipo } from "@/lib/relatorios-gerenciais";

type Ctx = { params: Promise<{ tipo: string }> };
const TIPOS = new Set<RelatorioGerencialTipo>(["clientes", "empreendimentos", "processos-minerarios", "processos-ambientais", "prazos"]);

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { tipo } = await params;
  if (!TIPOS.has(tipo as RelatorioGerencialTipo)) return NextResponse.json({ error: "Relatório inválido" }, { status: 404 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const dias = url.searchParams.get("dias") ?? undefined;
  const clienteId = url.searchParams.get("clienteId") ?? undefined;
  const relatorio = await buscarRelatorioGerencial(tipo as RelatorioGerencialTipo, { status, dias, clienteId });
  return relatorioPdfResponse(relatorio, tipo);
}
