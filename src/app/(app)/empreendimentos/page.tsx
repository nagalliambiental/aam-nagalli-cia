import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function EmpreendimentosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const empreendimentos = await prisma.empreendimento.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" as const } },
              { apelido: { contains: q, mode: "insensitive" as const } },
              { municipio: { contains: q, mode: "insensitive" as const } },
              { tipo: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { nome: "asc" },
    include: {
      empresaPrincipal: true,
      _count: { select: { areas: true, processos: true, licencas: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Empreendimentos"
        subtitle="Unidades operacionais e seus vínculos"
        actions={
          <Link href="/empreendimentos/nova">
            <Button>Novo empreendimento</Button>
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
              placeholder="Buscar por nome, apelido, município ou tipo..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {empreendimentos.map((e) => (
            <li key={e.id}>
              <Link
                href={`/empreendimentos/${e.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {e.nome}
                    {e.apelido ? <span className="ml-2 text-xs font-normal text-navy-600">· {e.apelido}</span> : null}
                  </p>
                  <p className="text-sm text-muted">
                    {e.tipo}
                    {e.municipio && e.uf ? ` · ${e.municipio}/${e.uf}` : ""}
                    {e.empresaPrincipal ? ` · ${e.empresaPrincipal.razaoSocial}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>{e._count.processos} processos</p>
                  </div>
                  <Badge tone={e.status === "ativo" ? "green" : "amber"}>{e.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {empreendimentos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum empreendimento cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
