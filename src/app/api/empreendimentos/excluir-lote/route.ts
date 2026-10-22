import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

// Exclusão definitiva em lote de empreendimentos (cascata remove processos, licenças, tarefas e faturas).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray((body as { ids?: unknown[] }).ids)
    ? [...new Set(((body as { ids: unknown[] }).ids).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))]
    : [];
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
