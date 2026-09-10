import { PageHeader, Card } from "@/components/ui";
import { requirePermissao } from "@/lib/perfil";

export default async function MovimentacoesIatPage() {
  await requirePermissao("processo:ler");
  return (
    <div>
      <PageHeader title="Movimentações IAT" subtitle="Consulta pública do e-Protocolo do Paraná" />
      <Card className="p-6">
        <p className="text-sm text-muted">
          Este módulo está em estudo. A consulta pública do e-Protocolo será implementada após validarmos os limites de acesso, documentos públicos e autenticação exigida pelo IAT.
        </p>
      </Card>
    </div>
  );
}
