import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:editar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const tipo = body.tipo === "informativo" ? "informativo" : body.tipo === "exigencia" ? "exigencia" : null;
  if (!tipo) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  try {
    const condicionante = await prisma.condicionante.update({ where: { id: Number(id) }, data: { tipo } });
    await audit({ tipoEntidade: "condicionante", entidadeId: condicionante.id, acao: "editar", usuarioId: Number(session.user.id), valorNovo: tipo });
    return NextResponse.json({ id: condicionante.id, tipo });
  } catch { return NextResponse.json({ error: "Condicionante não encontrada." }, { status: 404 }); }
}
