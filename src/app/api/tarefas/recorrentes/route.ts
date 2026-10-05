import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroSegregacao } from "@/lib/segregacao";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const isAdmin = session.user.perfilNome === "Administrador";
  const { scoped, responsavelPessoaId } = await filtroSegregacao();

  const regras = await prisma.tarefaRecorrente.findMany({
    where: {
      ...(isAdmin ? {} : { visibilidade: "publico" }),
      ...(scoped && responsavelPessoaId ? { responsavelPessoaId } : {}),
    },
    orderBy: { id: "desc" },
    include: {
      responsavel: { select: { nome: true } },
      empreendimento: { select: { nome: true, apelido: true } },
      processo: { select: { numero: true, orgao: { select: { sigla: true } } } },
      tarefas: {
        where: { ativo: true, deletedAt: null },
        orderBy: { id: "desc" },
        take: 1,
        select: { id: true, titulo: true, status: true, prazoData: true, dataConclusao: true },
      },
    },
  });

  return NextResponse.json({ regras });
}
