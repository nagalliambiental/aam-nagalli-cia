import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import type { RelatorioGerencial } from "@/lib/relatorios-gerenciais";

const ROTULO_STATUS_TAREFA: Record<string, string> = {
  nao_iniciado: "Não Iniciado",
  em_andamento: "Em Andamento",
  para_revisao: "Para Revisão",
  concluida: "Concluída",
};

const ROTULO_PRIORIDADE: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const ROTULO_STATUS_PRAZO: Record<string, string> = {
  futuro: "Futuro",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_TAREFA_VALIDOS = new Set(Object.keys(ROTULO_STATUS_TAREFA));

function colunas(labels: string[]) {
  return labels.map((label, index) => ({ label, key: `coluna${index}` }));
}

/**
 * Relatório das tarefas com os mesmos filtros/escopo da tela de Tarefas
 * (aba de status, busca por título, visibilidade e segregação por responsável).
 */
export async function montarRelatorioTarefas(filtro: { status?: string; q?: string } = {}): Promise<RelatorioGerencial> {
  const session = await auth();
  const isAdmin = session?.user?.perfilNome === "Administrador";
  const scoped = session?.user?.perfilNome === "Técnico";
  const pessoaId = scoped ? (session?.user?.pessoaId ?? null) : null;
  const escopo = scoped && pessoaId ? { OR: [{ processo: { responsavelPessoaId: pessoaId } }, { responsavelPessoaId: pessoaId }] } : {};
  const status = filtro.status && STATUS_TAREFA_VALIDOS.has(filtro.status) ? filtro.status : undefined;
  const q = filtro.q?.trim();

  const tarefas = await prisma.tarefa.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(isAdmin ? {} : { visibilidade: "publico" }),
      ...escopo,
      ...(status ? { status } : {}),
      ...(q ? { titulo: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ status: "asc" }, { prazoData: "asc" }],
    include: { responsavel: true, processo: { include: { orgao: true } }, empreendimento: true },
  });

  const rotuloStatus = status ? ROTULO_STATUS_TAREFA[status] : "Todos";

  return {
    titulo: `Tarefas — ${rotuloStatus}${q ? ` — busca "${q}"` : ""}`,
    colunas: colunas([
      "Título",
      "Responsável",
      "Status",
      "Prioridade",
      "Prazo Final",
      "Limite de Execução Serviço",
      "Processo",
      "Empreendimento",
    ]),
    linhas: tarefas.map((t) => [
      t.titulo,
      t.responsavel.nome,
      ROTULO_STATUS_TAREFA[t.status] ?? t.status,
      ROTULO_PRIORIDADE[t.prioridade] ?? t.prioridade,
      formatDate(t.prazoData),
      formatDate(t.dataLimite),
      t.processo ? `#${t.processo.numero} (${t.processo.orgao.sigla})` : "—",
      t.empreendimento ? (t.empreendimento.apelido || t.empreendimento.nome) : "—",
    ]),
  };
}

/**
 * Relatório dos prazos com os mesmos filtros da tela de Prazos
 * (aba "A cumprir"/"Concluídos" e busca por descrição).
 */
export async function montarRelatorioPrazos(filtro: { status?: string; q?: string } = {}): Promise<RelatorioGerencial> {
  const q = filtro.q?.trim();
  const verConcluidos = filtro.status === "concluido";

  const prazos = await prisma.prazo.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      processo: { ativo: true, deletedAt: null },
      status: verConcluidos ? "concluido" : { notIn: ["concluido", "cancelado"] as string[] },
      ...(q ? { descricao: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { dataCalculadaAtual: "asc" },
    include: { processo: { include: { orgao: true } }, responsavel: true },
  });

  return {
    titulo: `Prazos — ${verConcluidos ? "Concluídos" : "A cumprir"}${q ? ` — busca "${q}"` : ""}`,
    colunas: colunas(["Descrição", "Processo", "Órgão", "Status", "Data Calculada", "Responsável"]),
    linhas: prazos.map((p) => [
      p.descricao,
      p.processo ? `#${p.processo.numero}` : "—",
      p.processo ? p.processo.orgao.sigla : "—",
      ROTULO_STATUS_PRAZO[p.status] ?? p.status,
      formatDate(p.dataCalculadaAtual),
      p.responsavel?.nome ?? "—",
    ]),
  };
}
