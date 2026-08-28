import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type PermissaoKey = string; // formato "modulo:acao"

/**
 * Retorna o usuário autenticado ou redireciona para /login.
 * Uso em páginas/proteções server-side.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

/**
 * Guarda de permissão (RBAC por permissão). Verifica se o usuário logado
 * possui a permissão "modulo:acao". Redireciona para / (403) se não tiver.
 */
export async function requirePermissao(chave: PermissaoKey) {
  const user = await requireAuth();
  const tem = user.permissoes?.includes(chave);
  if (!tem) {
    redirect("/");
  }
  return user;
}

/**
 * Verificação booleana (para uso em server components / data loading),
 * sem redirecionar — útil para condicionais de UI.
 */
export async function usuarioTemPermissao(chave: PermissaoKey): Promise<boolean> {
  const session = await auth();
  return !!(session?.user?.permissoes?.includes(chave));
}
