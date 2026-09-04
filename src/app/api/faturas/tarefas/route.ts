import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const empreendimentoId = Number(q.get("empreendimentoId"));
  const inicio = q.get("inicio");
  const fim = q.get("fim");
  if (!empreendimentoId || !inicio || !fim) {
    return NextResponse.json({ error: "Informe empreendimentoId, inicio e fim (yyyy-mm-dd)." }, { status: 400 });
  }

  const ini = new Date(`${inicio}T00:00:00`);
  const f = new Date(`${fim}T23:59:59`);

  const tarefas = await prisma.tarefa.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      dataCriacao: { gte: ini, lte: f },
      OR: [
        { empreendimentoId },
        { processo: { empreendimentoId } },
      ],
    },
    orderBy: { dataCriacao: "asc" },
    include: {
      processo: { select: { numero: true } },
      empreendimento: { select: { nome: true, apelido: true } },
    },
  });

  return NextResponse.json(
    tarefas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      dataCriacao: t.dataCriacao.toISOString(),
      processoNumero: t.processo?.numero ?? null,
      empreendimentoNome: t.empreendimento?.apelido || t.empreendimento?.nome || t.processo?.numero || "",
    }))
  );
}
