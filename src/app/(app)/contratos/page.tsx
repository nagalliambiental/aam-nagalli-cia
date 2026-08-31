import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, PageHeader, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function ContratosPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("cadastro:ler");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const contratos = await prisma.contrato.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" as const } },
              { descricao: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
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
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por número ou descrição..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
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
