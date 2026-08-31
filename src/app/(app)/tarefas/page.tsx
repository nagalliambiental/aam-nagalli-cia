import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function TarefasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const tarefas = await prisma.tarefa.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q ? { titulo: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ status: "asc" }, { prazoData: "asc" }],
    include: {
      responsavel: true,
      processo: { include: { orgao: true } },
    },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Tarefas" subtitle="Visão geral das tarefas em aberto" />

      <Card>
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por título da tarefa..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-100">
          {tarefas.map((t) => (
            <li key={t.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-navy-900">{t.titulo}</p>
                  <p className="text-xs text-muted">
                    {t.responsavel.nome}
                    {t.processo ? (
                      <>
                        {" "}· processo{" "}
                        <Link href={`/processos/${t.processo.id}`} className="text-navy-700 underline">
                          #{t.processo.numero} ({t.processo.orgao.sigla})
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.prazoData && (
                    <span className="text-xs text-muted">{formatDate(t.prazoData)}</span>
                  )}
                  <Badge tone={t.status === "concluida" ? "green" : t.status === "em_andamento" ? "blue" : "amber"}>
                    {t.status}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
          {tarefas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma tarefa cadastrada.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
