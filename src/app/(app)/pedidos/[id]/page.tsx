import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { PedidoImprimir, PedidoStatusUpdate } from "@/components/comercial/PedidoActions";
import { PageHeader } from "@/components/ui";

export default async function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissao("custo:ler");

  const pedido = await prisma.pedido.findFirst({
    where: { id: Number(id), ativo: true, deletedAt: null },
    include: { empresa: true, itens: { include: { servico: true } } },
  });
  if (!pedido) notFound();

  const desconto = pedido.descontoTipo
    ? pedido.descontoTipo === "percentual"
      ? Number(pedido.subtotal) * (Math.min(100, Number(pedido.descontoValor ?? 0)) / 100)
      : Math.min(Number(pedido.descontoValor ?? 0), Number(pedido.subtotal))
    : 0;

  return (
    <div>
      <PageHeader
        title={`Pedido ${pedido.numero}`}
        subtitle={pedido.empresa.nomeFantasia || pedido.empresa.razaoSocial}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <PedidoStatusUpdate pedidoId={pedido.id} status={pedido.status} />
            <PedidoImprimir />
            <Link href="/pedidos">
              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-navy-600 ring-1 ring-slate-200 hover:bg-slate-100">Voltar</span>
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none print:max-w-none">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <p className="text-xl font-bold text-navy-900">AAM Nagalli &amp; Cia LTDA</p>
            <p className="text-sm text-muted">Consultoria ambiental e mineral</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-navy-900">PEDIDO {pedido.numero}</p>
            <p className="text-xs text-muted">Emissão: {formatDate(pedido.data)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Cliente</p>
            <p className="mt-1 font-medium text-navy-900">{pedido.empresa.razaoSocial}</p>
            <p className="text-sm text-muted">{pedido.empresa.nomeFantasia ? `Fantasia: ${pedido.empresa.nomeFantasia}` : ""}</p>
            {pedido.empresa.cnpj && <p className="text-sm text-muted">CNPJ: {pedido.empresa.cnpj}</p>}
            {pedido.empresa.municipio && <p className="text-sm text-muted">{pedido.empresa.municipio}{pedido.empresa.uf ? `/${pedido.empresa.uf}` : ""}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted">Status</p>
            <p className="mt-1 font-medium text-navy-900 capitalize">{pedido.status}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2">Descrição</th>
              <th className="py-2 text-right">Un</th>
              <th className="py-2 text-right">Qtd</th>
              <th className="py-2 text-right">Valor unit.</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2">{it.descricao}</td>
                <td className="py-2 text-right">{it.unidade}</td>
                <td className="py-2 text-right">{Number(it.quantidade)}</td>
                <td className="py-2 text-right">{formatMoney(it.valorUnitario)}</td>
                <td className="py-2 text-right font-medium">{formatMoney(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatMoney(pedido.subtotal)}</span></div>
          {pedido.descontoTipo && (
            <div className="flex justify-between"><span className="text-muted">Desconto</span><span className="text-red-600">- {formatMoney(desconto)}</span></div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold">
            <span>Total</span><span>{formatMoney(pedido.total)}</span>
          </div>
        </div>

        {pedido.observacoes && (
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted">Observações</p>
            <p className="mt-1 whitespace-pre-wrap">{pedido.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
