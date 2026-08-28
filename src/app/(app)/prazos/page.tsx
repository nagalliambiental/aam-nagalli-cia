import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function PrazosPage() {
  const prazos = await prisma.prazo.findMany({
    where: { ativo: true, deletedAt: null },
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
        <CardHeader title="Prazos recentes" />
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
