import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { TituloForm } from "@/components/forms/TituloForm";

export default async function NovoTituloPage() {
  await requirePermissao("cadastro:criar");

  const [orgaos, tiposTitulo, pessoas] = await Promise.all([
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoTitulo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Novo título minerário" subtitle="Cadastro de título (pesquisa, lavra...)" />
      <Card>
        <CardHeader title="Dados do título" />
        <div className="p-5">
          <TituloForm
            orgaos={orgaos.map((x) => ({ id: x.id, sigla: x.sigla }))}
            tiposTitulo={tiposTitulo.map((x) => ({ id: x.id, nome: x.nome }))}
            pessoas={pessoas.map((x) => ({ id: x.id, nome: x.nome }))}
          />
        </div>
      </Card>
    </div>
  );
}
