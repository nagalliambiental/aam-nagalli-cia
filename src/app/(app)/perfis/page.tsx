import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { UserCog, ShieldCheck, Users, Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function PerfisPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("config:ler");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const perfis = await prisma.perfil.findMany({
    where: {
      ativo: true,
      ...(q ? { nome: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { usuarios: true, permissoes: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Perfis de acesso"
        subtitle="Controle de permissões por perfil de usuário"
        actions={
          <Link href="/perfis/nova">
            <Button>Novo perfil</Button>
          </Link>
        }
      />

      <Card>
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome do perfil..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-100">
          {perfis.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-navy-900">
                    {p.nome}{" "}
                    {p.sistema && <Badge tone="gold">sistema</Badge>}
                  </p>
                  <p className="text-xs text-muted">{p.descricao ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right text-xs text-muted">
                  <p className="flex items-center justify-end gap-1">
                    <Users className="h-3.5 w-3.5" /> {p._count.usuarios} usuários
                  </p>
                  <p className="mt-0.5">{p._count.permissoes} permissões</p>
                </div>
                <Link
                  href={`/perfis/${p.id}/editar`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:underline"
                >
                  <UserCog className="h-4 w-4" /> Editar
                </Link>
              </div>
            </li>
          ))}
          {perfis.length === 0 && (
            <li className="px-5 py-12 text-center text-muted">Nenhum perfil cadastrado.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
