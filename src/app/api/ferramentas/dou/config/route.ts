import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDouWorkflowCron, updateDouWorkflowCron } from "@/lib/github-workflow";

async function autorizar() {
  const session = await auth();
  if (!session?.user?.id) return { response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (session.user.perfilNome !== "Administrador" && !session.user.permissoes?.includes("config:editar")) return { response: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const authz = await autorizar();
  if (authz.response) return authz.response;
  try { return NextResponse.json(await getDouWorkflowCron()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao consultar o GitHub." }, { status: 502 }); }
}

export async function PUT(req: Request) {
  const authz = await autorizar();
  if (authz.response) return authz.response;
  const body = await req.json().catch(() => ({}));
  try { return NextResponse.json(await updateDouWorkflowCron(String(body.cron ?? "").trim())); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao atualizar o workflow." }, { status: 400 }); }
}
