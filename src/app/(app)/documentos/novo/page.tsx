import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { DocumentoForm } from "@/components/forms/DocumentoForm";

export default async function NovoDocumentoPage() {
  await requirePermissao("documento:criar");

  return (
    <div>
      <PageHeader title="Novo documento" subtitle="Envio e cadastro de arquivo" />
      <Card>
        <CardHeader title="Upload" />
        <div className="p-5">
          <DocumentoForm />
        </div>
      </Card>
    </div>
  );
}
