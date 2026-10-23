import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

// Exclusão definitiva em lote de faturas (itens em cascata). Sem busca — "tudo" = todas.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Somente administrador" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: unknown[]; tudo?: unknown };
  const ids: number[] = Array.isArray(body.ids)
    ? [...new Set(body.ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))]
    : [];
  let alvos: number[];
  if (body.tudo === true) {
    alvos = (await prisma.fatura.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true } })).map((a) => a.id);
  } else {
    alvos = ids;
  }
  if (alvos.length === 0) return NextResponse.json({ error: "Nenhum id informado" }, { status: 400 });

  const t = await prisma.fatura.findMany({ where: { id: { in: alvos } }, select: { id: true } });
  for (const id of alvos.slice()) {
    try {
      await prisma.fatura.delete({ where: { id } });
    } catch {
      // fatura já removida em cascata por outra; ignora
    }
  }
  for (const f of t) {
    await audit({ tipoEntidade: "fatura", entidadeId: f.id, acao: "excluir", usuarioId: Number(session.user.id), valorNovo: "exclusão em lote" }).catch(() => {});
  }
  return NextResponse.json({ exclidos: t.length, bloqueados: [], total: alvos.length });
}
