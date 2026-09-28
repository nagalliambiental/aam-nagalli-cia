import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroSegregacao } from "@/lib/segregacao";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export type BuscaHit = {
  tipo: "processo" | "tarefa" | "empreendimento" | "empresa";
  id: number;
  titulo: string;
  subtitulo: string | null;
  url: string;
};

const LIMITE = 6;

function recortar(texto: string | null, limite = 90): string | null {
  if (!texto) return null;
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ resultados: [] });

  const permissoes = session.user.permissoes ?? [];
  const isAdmin = session.user.perfilNome === "Administrador";
  const { scoped, responsavelPessoaId } = await filtroSegregacao();

  const busca = { contains: q, mode: "insensitive" as const };
  const escopoTarefa: Prisma.TarefaWhereInput | null =
    scoped && responsavelPessoaId
      ? { OR: [{ processo: { responsavelPessoaId } }, { responsavelPessoaId }] }
      : null;

  const [processos, tarefas, empreendimentos, empresas] = await Promise.all([
    permissoes.includes("processo:ler")
      ? prisma.processo.findMany({
          where: {
            ativo: true,
            deletedAt: null,
            OR: [{ numero: busca }, { apelido: busca }, { nup: busca }],
          },
          orderBy: { dataAbertura: "desc" },
          take: LIMITE,
          select: {
            id: true,
            numero: true,
            apelido: true,
            nup: true,
            natureza: true,
            empreendimento: { select: { nome: true, apelido: true } },
          },
        })
      : Promise.resolve([]),
    prisma.tarefa.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        ...(isAdmin ? {} : { visibilidade: "publico" }),
        AND: [ ...(escopoTarefa ? [escopoTarefa] : []), { titulo: busca } ],
      },
      orderBy: [{ status: "asc" }, { prazoData: "asc" }],
      take: LIMITE,
      select: { id: true, titulo: true, status: true, responsavel: { select: { nome: true } } },
    }),
    permissoes.includes("cadastro:ler")
      ? prisma.empreendimento.findMany({
          where: { ativo: true, deletedAt: null, OR: [{ nome: busca }, { apelido: busca }] },
          orderBy: { nome: "asc" },
          take: LIMITE,
          select: { id: true, nome: true, apelido: true },
        })
      : Promise.resolve([]),
    permissoes.includes("cadastro:ler")
      ? prisma.empresa.findMany({
          where: { ativo: true, deletedAt: null, OR: [{ razaoSocial: busca }, { nomeFantasia: busca }] },
          orderBy: { razaoSocial: "asc" },
          take: LIMITE,
          select: { id: true, razaoSocial: true, nomeFantasia: true },
        })
      : Promise.resolve([]),
  ]);

  const resultados: BuscaHit[] = [
    ...processos.map((p) => ({
      tipo: "processo" as const,
      id: p.id,
      titulo: `Processo #${p.numero}${p.apelido ? ` · ${p.apelido}` : ""}`,
      subtitulo: recortar(
        p.empreendimento ? (p.empreendimento.apelido || p.empreendimento.nome) : p.nup ?? p.natureza,
      ),
      url: `/processos/${p.id}`,
    })),
    ...tarefas.map((t) => ({
      tipo: "tarefa" as const,
      id: t.id,
      titulo: t.titulo,
      subtitulo: t.responsavel?.nome ?? null,
      url: `/tarefas/${t.id}`,
    })),
    ...empreendimentos.map((e) => ({
      tipo: "empreendimento" as const,
      id: e.id,
      titulo: e.nome,
      subtitulo: e.apelido && e.apelido !== e.nome ? e.apelido : null,
      url: `/empreendimentos/${e.id}`,
    })),
    ...empresas.map((e) => ({
      tipo: "empresa" as const,
      id: e.id,
      titulo: e.razaoSocial,
      subtitulo: e.nomeFantasia && e.nomeFantasia !== e.razaoSocial ? e.nomeFantasia : null,
      url: `/empresas/${e.id}`,
    })),
  ];

  return NextResponse.json({ resultados });
}
