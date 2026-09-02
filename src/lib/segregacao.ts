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

/** Filtro direto para consultas na tabela Processo. */
export function filtroProcesso(scoped: boolean, pessoaId: number | null): { responsavelPessoaId?: number } {
  return scoped && pessoaId ? { responsavelPessoaId: pessoaId } : {};
}

/** Filtro para consultas que passam pela relação `processo` (prazo, tarefa, exigência). */
export function filtroPorProcesso(scoped: boolean, pessoaId: number | null): { processo?: { responsavelPessoaId: number } } {
  return scoped && pessoaId ? { processo: { responsavelPessoaId: pessoaId } } : {};
}
