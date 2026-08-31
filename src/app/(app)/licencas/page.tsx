import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function LicencasPage() {
  const licencas = await prisma.licenca.findMany({
    where: { ativo: true, deletedAt: null },
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
                    {l.empreendimento ? ` · ${l.empreendimento.nome}` : ""}
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
