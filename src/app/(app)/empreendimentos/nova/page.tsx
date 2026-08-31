import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { EmpreendimentoForm } from "@/components/forms/EmpreendimentoForm";

export default async function NovoEmpreendimentoPage() {
  await requirePermissao("cadastro:criar");

  const empresas = await prisma.empresa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { razaoSocial: "asc" },
  });

  return (
    <div>
      <PageHeader title="Novo empreendimento" subtitle="Cadastro de unidade operacional" />
      <Card>
        <CardHeader title="Dados do empreendimento" />
        <div className="p-5">
          <EmpreendimentoForm
            empresas={empresas.map((x) => ({ id: x.id, razaoSocial: x.razaoSocial }))}
          />
        </div>
      </Card>
    </div>
  );
}
