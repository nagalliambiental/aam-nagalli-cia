import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function OrgaosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const orgaos = await prisma.orgao.findMany({
    where: {
      ativo: true,
      ...(q
        ? {
            OR: [
              { sigla: { contains: q, mode: "insensitive" as const } },
              { nome: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { sigla: "asc" },
    include: { _count: { select: { processos: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Órgãos"
        subtitle="Órgãos ambientais e minerários (ANM, IAT, IBAMA...)"
        actions={
          <Link href="/orgaos/nova">
            <Button>Novo órgão</Button>
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
              placeholder="Buscar por sigla ou nome..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {orgaos.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-navy-900">
                  {o.sigla} <span className="text-muted font-normal">· {o.nome}</span>
                </p>
                <p className="text-sm text-muted">
                  {o.ambito} · {o.nivel} · {o._count.processos} processos
                </p>
              </div>
              <Badge tone={o.ativo ? "green" : "gray"}>ativo</Badge>
            </li>
          ))}
          {orgaos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum órgão cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
