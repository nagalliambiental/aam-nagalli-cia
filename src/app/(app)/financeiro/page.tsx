import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function FinanceiroPage() {
  await requirePermissao("relatorio:ler");

  const contratos = await prisma.contrato.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { dataAssinatura: "desc" },
    include: { empresa: true },
  });

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Contratos e faturas"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/faturas">
              <Button variant="secondary">Faturas</Button>
            </Link>
            <Link href="/contratos/nova">
              <Button>Novo contrato</Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardHeader title="Contratos" />
        <ul className="divide-y divide-slate-200">
          {contratos.map((co) => (
            <li key={co.id}>
              <Link
                href={`/contratos/${co.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {co.empresa.nomeFantasia || co.empresa.razaoSocial}
                    {co.numero ? ` — ${co.numero}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {co.descricao ?? "Contrato"}
                    {co.dataAssinatura ? ` · ${formatDate(co.dataAssinatura)}` : ""}
                    {co.dataValidade ? ` → ${formatDate(co.dataValidade)}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {contratos.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted">Nenhum contrato.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
