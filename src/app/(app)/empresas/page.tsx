import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button, Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { formatCNPJ } from "@/lib/format";
import { Search } from "lucide-react";
import { ImportarClientes } from "@/components/empresas/ImportarClientes";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function EmpresasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const empresas = await prisma.empresa.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { razaoSocial: { contains: q, mode: "insensitive" as const } },
              { nomeFantasia: { contains: q, mode: "insensitive" as const } },
              { apelido: { contains: q, mode: "insensitive" as const } },
              { cnpj: { contains: q, mode: "insensitive" as const } },
              { municipio: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { razaoSocial: "asc" },
    include: {
      _count: { select: { empreendimentosPrincipais: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes (empresas)"
        actions={
          <div className="flex items-center gap-2">
            <ImportarClientes />
            <Link href="/api/relatorios/clientes/xlsx" target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar XLSX</Button>
            </Link>
            <Link href="/api/relatorios/clientes/pdf" target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar PDF</Button>
            </Link>
            <Link href="/api/relatorios/clientes/modelo" target="_blank" rel="noreferrer">
              <Button variant="ghost">Modelo</Button>
            </Link>
            <Link href="/empresas/nova">
              <Button>Nova empresa</Button>
            </Link>
          </div>
        }
      />

      <Card>
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por razão social, apelido, CNPJ ou município..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {empresas.map((e) => (
            <li key={e.id}>
              <Link
                href={`/empresas/${e.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {e.razaoSocial}
                    {e.apelido ? <span className="ml-2 text-xs font-normal text-navy-600">· {e.apelido}</span> : null}
                  </p>
                  <p className="text-sm text-muted">
                    {e.cnpj ? formatCNPJ(e.cnpj) : "sem CNPJ"}
                    {e.municipio && e.uf ? ` · ${e.municipio}/${e.uf}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted">
                    <p>{e._count.empreendimentosPrincipais} empreend.</p>
                  </div>
                  <Badge tone={e.ativo ? "green" : "gray"}>
                    {e.ativo ? "ativo" : "inativo"}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
          {empresas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma empresa cadastrada ainda.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
