import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function PrazosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const prazos = await prisma.prazo.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q ? { descricao: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { dataCalculadaAtual: "asc" },
    include: {
      processo: { include: { orgao: true } },
    },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Prazos" subtitle="Prazos calculados por processo e status" />

      <Card>
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por descrição..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-100">
          {prazos.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-navy-900">{p.descricao}</p>
                  <p className="text-xs text-muted">
                    {p.processo ? (
                      <>
                        {" "}processo # <span className="text-navy-700">{p.processo.numero}</span> ·{" "}
                        {p.processo.orgao.sigla}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.dataCalculadaAtual && (
                    <span className="text-xs text-muted">
                      até {formatDate(p.dataCalculadaAtual)}
                    </span>
                  )}
                  <Badge tone="amber">{p.status}</Badge>
                </div>
              </div>
            </li>
          ))}
          {prazos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum prazo cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
