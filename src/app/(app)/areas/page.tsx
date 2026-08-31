import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function AreasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const areas = await prisma.area.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" as const } },
              { municipio: { contains: q, mode: "insensitive" as const } },
              { tipo: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { empreendimentos: true, processos: true, titulos: true, licencas: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Áreas"
        subtitle="Imóveis e áreas de operação"
        actions={
          <Link href="/areas/nova">
            <Button>Nova área</Button>
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
              placeholder="Buscar por nome, município ou tipo..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {areas.map((a) => (
            <li key={a.id}>
              <Link
                href={`/areas/${a.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">{a.nome}</p>
                  <p className="text-sm text-muted">
                    {a.tipo}
                    {a.areaHa ? ` · ${a.areaHa} ha` : ""}
                    {a.municipio && a.uf ? ` · ${a.municipio}/${a.uf}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>{a._count.titulos} títulos</p>
                    <p>{a._count.licencas} licenças</p>
                  </div>
                  <Badge tone={a.situacao === "ativa" ? "green" : "amber"}>{a.situacao}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {areas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma área cadastrada.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
