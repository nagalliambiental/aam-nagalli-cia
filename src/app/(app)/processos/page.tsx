import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/processos/StatusBadge";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function ProcessosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const processos = await prisma.processo.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" as const } },
              { assunto: { contains: q, mode: "insensitive" as const } },
              { descricao: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { dataAbertura: "desc" },
    include: {
      orgao: true,
      tipoProcesso: true,
      empreendimento: true,
      _count: { select: { eventos: true, prazos: true, tarefas: true, exigencias: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Processos"
        subtitle="Hub operacional: processos minerários e ambientais"
        actions={
          <Link href="/processos/novo">
            <Button>Novo processo</Button>
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
              placeholder="Buscar por número, assunto ou descrição..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {processos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/processos/${p.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    #{p.numero} <span className="text-muted font-normal">· {p.orgao.sigla}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {p.tipoProcesso.nome}
                    {p.empreendimento ? ` · ${p.empreendimento.nome}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>aberto em {formatDate(p.dataAbertura)}</p>
                    <p>
                      {p._count.eventos} eventos · {p._count.prazos} prazos ·{" "}
                      {p._count.tarefas} tarefas
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            </li>
          ))}
          {processos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum processo cadastrado ainda.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
