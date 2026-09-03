import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

const STATUS: Record<string, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  aberto: { label: "Aberto", tone: "blue" },
  enviado: { label: "Enviado", tone: "amber" },
  pago: { label: "Pago", tone: "green" },
  cancelado: { label: "Cancelado", tone: "gray" },
};

export default async function PedidosPage() {
  await requirePermissao("custo:ler");

  const pedidos = await prisma.pedido.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { data: "desc" },
    include: { empresa: true, _count: { select: { itens: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Gerador de pedidos / cobrança aos clientes"
        actions={
          <Link href="/pedidos/nova">
            <Button>Novo pedido</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-100">
          {pedidos.map((p) => {
            const st = STATUS[p.status] ?? { label: p.status, tone: "gray" as const };
            return (
              <li key={p.id}>
                <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-navy-900">
                      Pedido {p.numero}
                      <span className="ml-2 text-muted font-normal">· {p.empresa.nomeFantasia || p.empresa.razaoSocial}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(p.data)} · {p._count.itens} item(ns)
                      {p.descontoTipo ? ` · desconto` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-navy-900">{formatMoney(p.total)}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
          {pedidos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">Nenhum pedido gerado ainda.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
