import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

// Exclusão definitiva em lote de faturas (itens removidos em cascata).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Somente administrador" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray((body as { ids?: unknown[] }).ids)
    ? [...new Set(((body as { ids: unknown[] }).ids).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))]
    : [];
  if (ids.length === 0) return NextResponse.json({ error: "Nenhum id informado" }, { status: 400 });

  const t = await prisma.fatura.findMany({ where: { id: { in: ids } }, select: { id: true } });
  await prisma.fatura.deleteMany({ where: { id: { in: ids } } });
  for (const f of t) {
    await audit({ tipoEntidade: "fatura", entidadeId: f.id, acao: "excluir", usuarioId: Number(session.user.id), valorNovo: "exclusão em lote" }).catch(() => {});
  }
  return NextResponse.json({ exclidos: t.length, bloqueados: [], total: ids.length });
}
