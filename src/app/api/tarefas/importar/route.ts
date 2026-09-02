import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importarTarefasXlsx } from "@/lib/tarefas-import";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("tarefa:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo XLSX obrigatório" }, { status: 400 });
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json({ error: "Envie um arquivo Excel (.xlsx)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { criadas, erros } = await importarTarefasXlsx(buffer);
    return NextResponse.json({ criadas, erros, fileName: file.name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar";
    return NextResponse.json({ error: `Erro ao importar: ${msg}` }, { status: 500 });
  }
}
