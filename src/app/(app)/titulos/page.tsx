import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function TitulosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const titulos = await prisma.tituloMinerario.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" as const } },
              { substancia: { contains: q, mode: "insensitive" as const } },
              { municipio: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ situacao: "asc" }, { validade: "asc" }],
    include: {
      tipoTitulo: true,
      orgao: true,
      _count: { select: { processos: true, areas: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Títulos minerários"
        subtitle="Alvarás de pesquisa, concessões de lavra e demais títulos"
        actions={
          <Link href="/titulos/novo">
            <Button>Novo título</Button>
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
              placeholder="Buscar por número, substância ou município..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {titulos.map((t) => (
            <li key={t.id}>
              <Link
                href={`/titulos/${t.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {t.numero} <span className="text-muted font-normal">· {t.orgao.sigla}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {t.tipoTitulo.nome}
                    {t.substancia ? ` · ${t.substancia}` : ""}
                    {t.municipio ? ` · ${t.municipio}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    {t.validade && <p>validade {formatDate(t.validade)}</p>}
                    <p>{t._count.areas} áreas</p>
                  </div>
                  <Badge tone={t.situacao === "ativo" ? "green" : "amber"}>{t.situacao}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {titulos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum título minerário cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
