import { requirePermissao } from "@/lib/perfil";
import { Card, PageHeader, CardHeader } from "@/components/ui";
import { OrgaoForm } from "@/components/forms/OrgaoForm";

export default async function NovoOrgaoPage() {
  await requirePermissao("cadastro:criar");

  return (
    <div>
      <PageHeader title="Novo órgão" subtitle="Cadastro de órgão ambiental ou minerário" />
      <Card>
        <CardHeader title="Dados do órgão" />
        <div className="p-5">
          <OrgaoForm />
        </div>
      </Card>
    </div>
  );
}
