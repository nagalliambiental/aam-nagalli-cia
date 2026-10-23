import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { whereLote, type FiltroLoteBruto } from "@/lib/excluir-lote";

// Exclusão definitiva em lote de empreendimentos (cascata remove processos, licenças, tarefas e faturas).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: unknown[]; tudo?: unknown; filtro?: FiltroLoteBruto };
  let ids: number[];
  if (body.tudo === true) {
    const where = whereLote("empreendimento", body.filtro);
    if (!where) return NextResponse.json({ error: "Filtro inválido" }, { status: 400 });
    const alvos = await prisma.empreendimento.findMany({ where: where as never, select: { id: true } });
    ids = alvos.map((a) => a.id);
  } else {
    ids = Array.isArray(body.ids)
      ? [...new Set(body.ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))]
      : [];
  }
  if (ids.length === 0) return NextResponse.json({ error: "Nenhum id informado" }, { status: 400 });

  let exclidos = 0;
  const bloqueados: number[] = [];
  for (const id of ids) {
    try {
      await prisma.empreendimento.delete({ where: { id } });
      exclidos++;
      await audit({ tipoEntidade: "empreendimento", entidadeId: id, acao: "excluir", usuarioId: Number(session.user.id), valorNovo: "exclusão em lote" });
    } catch {
      bloqueados.push(id);
    }
  }
  return NextResponse.json({ exclidos, bloqueados, total: ids.length });
}
