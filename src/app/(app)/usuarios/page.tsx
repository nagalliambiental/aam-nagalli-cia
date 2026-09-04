import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { formatDate } from "@/lib/format";
import { UserCog, UserX, UserCheck, Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function UsuariosPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("usuario:ler");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const usuarios = await prisma.usuario.findMany({
    where: q ? { email: { contains: q, mode: "insensitive" } } : {},
    orderBy: { email: "asc" },
    include: { perfil: true, pessoa: true },
  });

  const ativos = usuarios.filter((u) => u.ativo).length;

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle={`${usuarios.length} usuários · ${ativos} ativos`}
        actions={
          <Link href="/usuarios/nova">
            <Button>Novo usuário</Button>
          </Link>
        }
      />

      <Card>
        <BuscaAuto placeholder="Buscar por e-mail..." valorInicial={q} />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Perfil</th>
                <th className="px-5 py-3">Último acesso</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/usuarios/${u.id}`} className="font-medium text-navy-900 hover:underline">
                      {u.pessoa?.nome ?? u.email}
                    </Link>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    {u.perfil.nome}
                    {u.perfil.sistema && <span className="ml-1 text-xs text-gold-600">· sistema</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {u.ultimoLoginEm ? formatDate(u.ultimoLoginEm) : "Nunca"}
                  </td>
                  <td className="px-5 py-3">
                    {u.ativo ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Inativo</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/usuarios/${u.id}/editar`}
                      className="inline-flex items-center gap-1 text-navy-600 hover:underline"
                    >
                      <UserCog className="h-4 w-4" /> Editar
                    </Link>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
