import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function DocumentosPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("documento:ler");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const documentos = await prisma.documento.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" as const } },
              { tipo: { contains: q, mode: "insensitive" as const } },
              { categoria: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { criadoEm: "desc" },
    include: {
      responsavel: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Gerenciamento documental"
        actions={
          <Link href="/documentos/novo">
            <Button>Novo documento</Button>
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
              placeholder="Buscar por nome, tipo ou categoria..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {documentos.map((d) => (
            <li key={d.id}>
              <Link
                href={`/documentos/${d.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">{d.nome}</p>
                  <p className="text-sm text-muted">
                    {d.tipo}
                    {d.categoria && d.categoria !== "documento" ? ` · ${d.categoria}` : ""}
                    {d.responsavel ? ` · ${d.responsavel.nome}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>v{d.versao}</p>
                    <p>{formatDate(d.data)}</p>
                  </div>
                  <Badge tone={d.status === "ativo" ? "green" : "amber"}>{d.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {documentos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum documento cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
