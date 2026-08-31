import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AreaForm } from "@/components/forms/AreaForm";

export default async function NovaAreaPage() {
  await requirePermissao("cadastro:criar");

  return (
    <div>
      <PageHeader title="Nova área" subtitle="Cadastro de imóvel ou área de operação" />
      <Card>
        <CardHeader title="Dados da área" />
        <div className="p-5">
          <AreaForm />
        </div>
      </Card>
    </div>
  );
}
