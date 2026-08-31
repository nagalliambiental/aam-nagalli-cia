import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PerfilForm } from "@/components/forms/PerfilForm";

export default async function NovoPerfilPage() {
  await requirePermissao("config:criar");

  const permissoes = await prisma.permissao.findMany({
    orderBy: [{ modulo: "asc" }, { acao: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Novo perfil" subtitle="Defina um novo perfil e suas permissões" />
      <Card>
        <CardHeader title="Dados do perfil" />
        <div className="p-5">
          <PerfilForm
            permissoes={permissoes.map((p) => ({ id: p.id, chave: p.chave, modulo: p.modulo, acao: p.acao }))}
          />
        </div>
      </Card>
    </div>
  );
}
