import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { whereLote, type FiltroLoteBruto } from "@/lib/excluir-lote";

// Exclusão definitiva em lote de áreas (vínculos removidos pelo banco; eventos ficam SET_NULL).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: unknown[]; tudo?: unknown; filtro?: FiltroLoteBruto };
  let exclidos = 0;
  const bloqueados: number[] = [];
  if (body.tudo === true) {
    const where = whereLote("area", body.filtro);
    if (!where) return NextResponse.json({ error: "Filtro inválido" }, { status: 400 });
    const alvos = await prisma.area.findMany({ where: where as never, select: { id: true } });
    for (const { id } of alvos) {
      try {
        await prisma.area.delete({ where: { id } });
        exclidos++;
        await audit({ tipoEntidade: "area", entidadeId: id, acao: "excluir", usuarioId: Number(session.user.id), valorNovo: "exclusão em lote" }).catch(() => {});
      } catch {
        bloqueados.push(id);
      }
    }
  } else {
    const ids = Array.isArray(body.ids)
      ? [...new Set(body.ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))]
      : [];
    if (ids.length === 0) return NextResponse.json({ error: "Nenhum id informado" }, { status: 400 });
    for (const id of ids) {
      try {
        await prisma.area.delete({ where: { id } });
        exclidos++;
        await audit({ tipoEntidade: "area", entidadeId: id, acao: "excluir", usuarioId: Number(session.user.id), valorNovo: "exclusão em lote" }).catch(() => {});
      } catch {
        bloqueados.push(id);
      }
    }
  }
  return NextResponse.json({ exclidos, bloqueados });
}
