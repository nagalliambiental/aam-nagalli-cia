import { requirePermissao } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ServicosManager } from "@/components/comercial/ServicosManager";

export default async function ServicosPage() {
  await requirePermissao("cadastro:ler");
  const servicos = await prisma.servico.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
  });
  return (
    <div>
      <PageHeader title="Serviços" subtitle="Catálogo de serviços para geração de pedidos" />
      <ServicosManager servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, descricao: s.descricao, valorUnitario: Number(s.valorUnitario), unidade: s.unidade }))} />
    </div>
  );
}
