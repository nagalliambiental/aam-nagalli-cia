import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gerarModeloTarefasXlsx } from "@/lib/tarefas-import";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const buf = await gerarModeloTarefasXlsx();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-tarefas.xlsx"',
    },
  });
}
