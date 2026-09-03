import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PedidoForm } from "@/components/comercial/PedidoForm";

export default async function NovoPedidoPage() {
  await requirePermissao("custo:criar");

  const [empresas, servicos] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { razaoSocial: "asc" }, select: { id: true, nomeFantasia: true, razaoSocial: true } }),
    prisma.servico.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true, valorUnitario: true, unidade: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Novo pedido" subtitle="Monte o pedido com os serviços do cliente" />
      <Card>
        <CardHeader title="Dados do pedido" />
        <div className="p-5">
          <PedidoForm
            empresas={empresas.map((e) => ({ id: e.id, nome: e.nomeFantasia || e.razaoSocial }))}
            servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, valorUnitario: Number(s.valorUnitario), unidade: s.unidade }))}
          />
        </div>
      </Card>
    </div>
  );
}
