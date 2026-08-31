import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { LicencaForm } from "@/components/forms/LicencaForm";

export default async function NovaLicencaPage() {
  await requirePermissao("cadastro:criar");

  const [orgaos, tiposLicenca, empreendimentos, pessoas] = await Promise.all([
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoLicenca.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Nova licença" subtitle="Cadastro de licença ambiental" />
      <Card>
        <CardHeader title="Dados da licença" />
        <div className="p-5">
          <LicencaForm
            orgaos={orgaos.map((x) => ({ id: x.id, sigla: x.sigla }))}
            tiposLicenca={tiposLicenca.map((x) => ({ id: x.id, nome: x.nome }))}
            empreendimentos={empreendimentos.map((x) => ({ id: x.id, nome: x.nome }))}
            pessoas={pessoas.map((x) => ({ id: x.id, nome: x.nome }))}
          />
        </div>
      </Card>
    </div>
  );
}
