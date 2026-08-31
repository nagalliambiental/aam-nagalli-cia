import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ContratoForm } from "@/components/forms/ContratoForm";

export default async function NovoContratoPage() {
  await requirePermissao("cadastro:criar");

  const empresas = await prisma.empresa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { razaoSocial: "asc" },
  });

  return (
    <div>
      <PageHeader title="Novo contrato" subtitle="Contrato comercial com cliente" />
      <Card>
        <CardHeader title="Dados do contrato" />
        <div className="p-5">
          <ContratoForm
            empresas={empresas.map((x) => ({ id: x.id, nome: x.nomeFantasia ?? x.razaoSocial }))}
          />
        </div>
      </Card>
    </div>
  );
}
