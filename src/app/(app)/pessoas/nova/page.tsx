import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PessoaForm } from "@/components/forms/PessoaForm";

export default async function NovaPessoaPage() {
  await requirePermissao("cadastro:criar");

  return (
    <div>
      <PageHeader title="Nova pessoa" subtitle="Cadastro de contato ou responsável" />
      <Card>
        <CardHeader title="Dados da pessoa" />
        <div className="p-5">
          <PessoaForm />
        </div>
      </Card>
    </div>
  );
}
