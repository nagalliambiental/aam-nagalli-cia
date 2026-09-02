import { auth } from "@/lib/auth";

/**
 * Segregação por responsável: usuário com perfil "Técnico" só enxerga os dados
 * cujo responsável é ele. "Técnico Chefe" e "Administrador" enxergam tudo.
 * Retorna o filtro a aplicar em consultas de Processo a partir da sessão.
 */
export async function filtroSegregacao(): Promise<{ scoped: boolean; responsavelPessoaId: number | null }> {
  const session = await auth();
  const scoped = session?.user?.perfilNome === "Técnico";
  const responsavelPessoaId = scoped ? (session?.user?.pessoaId ?? null) : null;
  return { scoped, responsavelPessoaId };
}

/**
 * Filtro direto para consultas na tabela Processo.
 * Regra atual (Opção 2): o Técnico enxerga TODOS os processos; a segregação
 * por responsável ficou desativada para processos (mantida apenas para tarefas).
 * Chefe/Admin continuam vendo tudo.
 */
export function filtroProcesso(_scoped: boolean, _pessoaId: number | null): { responsavelPessoaId?: number } {
  return {};
}

/** Filtro para consultas que passam pela relação `processo` (prazo, tarefa, exigência). */
export function filtroPorProcesso(scoped: boolean, pessoaId: number | null): { processo?: { responsavelPessoaId: number } } {
  return scoped && pessoaId ? { processo: { responsavelPessoaId: pessoaId } } : {};
}
