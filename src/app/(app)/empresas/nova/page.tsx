import { requirePermissao } from "@/lib/perfil";
import { Card, PageHeader, CardHeader } from "@/components/ui";
import { EmpresaForm } from "@/components/forms/EmpresaForm";

export default async function NovaEmpresaPage() {
  await requirePermissao("cadastro:criar");

  return (
    <div>
      <PageHeader title="Novo cliente" subtitle="Preencha os dados do cadastro" />
      <Card>
        <CardHeader title="Dados do cliente" />
        <div className="p-5">
          <EmpresaForm />
        </div>
      </Card>
    </div>
  );
}
