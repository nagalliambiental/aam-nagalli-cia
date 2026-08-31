import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, PageHeader, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function ContratosPage() {
  await requirePermissao("cadastro:ler");

  const contratos = await prisma.contrato.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { dataAssinatura: "desc" },
    include: { empresa: true },
  });

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Contratos comerciais com clientes"
        actions={
          <Link href="/contratos/nova">
            <Button>Novo contrato</Button>
          </Link>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Número</th>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Assinatura</th>
                <th className="px-5 py-3">Validade</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const expirado = c.dataValidade && c.dataValidade < new Date();
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-medium text-navy-900">
                      <Link href={`/contratos/${c.id}`} className="hover:underline">
                        {c.empresa.nomeFantasia ?? c.empresa.razaoSocial}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{c.numero ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{c.descricao ?? "—"}</td>
                    <td className="px-5 py-3">
                      {c.dataAssinatura ? formatDate(c.dataAssinatura) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {c.dataValidade ? formatDate(c.dataValidade) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {expirado ? (
                        <Badge tone="red">Expirado</Badge>
                      ) : c.dataValidade ? (
                        <Badge tone="green">Vigente</Badge>
                      ) : (
                        <Badge tone="blue">Sem validade</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {contratos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
