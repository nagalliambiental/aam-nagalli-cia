import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/processos/StatusBadge";

export default async function ProcessosPage() {
  const processos = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
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
