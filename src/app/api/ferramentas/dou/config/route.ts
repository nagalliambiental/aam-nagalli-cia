import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cronToHoraBrasilia, getDouWorkflowCron, horaBrasiliaToCron, updateDouWorkflowCron } from "@/lib/github-workflow";
import { prisma } from "@/lib/prisma";

async function autorizar() {
  const session = await auth();
  if (!session?.user?.id) return { response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (session.user.perfilNome !== "Administrador" && !session.user.permissoes?.includes("config:editar")) return { response: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const authz = await autorizar();
  if (authz.response) return authz.response;
  try { const [workflow, config] = await Promise.all([getDouWorkflowCron(), prisma.douConfiguracao.findUnique({ where: { id: 1 } })]); return NextResponse.json({ hora: cronToHoraBrasilia(workflow.cron), termosExtras: config?.termosExtras ?? "", termosDesativados: config?.termosDesativados ?? "" }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao consultar o GitHub." }, { status: 502 }); }
}

export async function PUT(req: Request) {
  const authz = await autorizar();
  if (authz.response) return authz.response;
  const body = await req.json().catch(() => ({}));
  const normalizarLinhas = (v: unknown) => String(v ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean).join("\n");
  try {
    const hora = String(body.hora ?? "").trim();
    const cron = horaBrasiliaToCron(hora);
    const termosExtras = normalizarLinhas(body.termosExtras);
    // termosDesativados é opcional (só atualiza se enviado pela aba de Termos)
    const soTermos = body.termosDesativados === undefined;
    const termosDesativados = soTermos ? undefined : normalizarLinhas(body.termosDesativados);
    const result = await updateDouWorkflowCron(cron);
    await prisma.douConfiguracao.upsert({
      where: { id: 1 },
      update: { termosExtras, ...(termosDesativados !== undefined ? { termosDesativados } : {}) },
      create: { id: 1, termosExtras, termosDesativados: termosDesativados ?? "" },
    });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao atualizar as configurações." }, { status: 400 }); }
}
