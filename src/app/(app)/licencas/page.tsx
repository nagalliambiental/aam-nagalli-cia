import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function LicencasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const licencas = await prisma.licenca.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q ? { numero: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ situacao: "asc" }, { dataValidade: "asc" }],
    include: {
      tipoLicenca: true,
      orgao: true,
      empreendimento: true,
      _count: { select: { condicionantes: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Licenças"
        subtitle="Licenças ambientais (LP, LI, LO...) e vínculos"
        actions={
          <Link href="/licencas/nova">
            <Button>Nova licença</Button>
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
              placeholder="Buscar por número..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {licencas.map((l) => (
            <li key={l.id}>
              <Link
                href={`/licencas/${l.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {l.numero} <span className="text-muted font-normal">· {l.orgao.sigla}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {l.tipoLicenca.nome}
                    {l.empreendimento ? ` · ${l.empreendimento.apelido || l.empreendimento.nome}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    {l.dataValidade && <p>validade {formatDate(l.dataValidade)}</p>}
                    <p>{l._count.condicionantes} condicionantes</p>
                  </div>
                  <Badge tone={l.situacao === "ativa" ? "green" : "amber"}>{l.situacao}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {licencas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma licença cadastrada.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
