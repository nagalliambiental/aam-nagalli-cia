import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function TarefasPage() {
  const tarefas = await prisma.tarefa.findMany({
    where: { ativo: true, deletedAt: null },
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
