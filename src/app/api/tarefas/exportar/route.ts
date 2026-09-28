import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { montarRelatorioTarefas } from "@/lib/exportacoes-listas";
import { relatorioPdfResponse, relatorioXlsxResponse } from "@/lib/relatorio-arquivos";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const formato = (url.searchParams.get("formato") ?? "pdf").toLowerCase();
  const status = url.searchParams.get("status") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const relatorio = await montarRelatorioTarefas({ status, q });
  return formato === "xlsx"
    ? relatorioXlsxResponse(relatorio, "tarefas")
    : relatorioPdfResponse(relatorio, "tarefas");
}
