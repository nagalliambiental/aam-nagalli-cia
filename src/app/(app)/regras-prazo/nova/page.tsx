import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { RegraPrazoForm } from "@/components/forms/RegraPrazoForm";

export default async function NovaRegraPage() {
  await requirePermissao("config:criar");

  const [orgaos, tiposProcesso, tiposEvento, tiposTitulo, tiposLicenca] = await Promise.all([
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoProcesso.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tipoEvento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tipoTitulo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tipoLicenca.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Nova regra de prazo" subtitle="Regra de automação de prazos" />
      <Card>
        <CardHeader title="Definição da regra" />
        <div className="p-5">
          <RegraPrazoForm
            orgaos={orgaos.map((x) => ({ id: x.id, sigla: x.sigla }))}
            tiposProcesso={tiposProcesso.map((x) => ({ id: x.id, nome: x.nome }))}
            tiposEvento={tiposEvento.map((x) => ({ id: x.id, nome: x.nome }))}
            tiposTitulo={tiposTitulo.map((x) => ({ id: x.id, nome: x.nome }))}
            tiposLicenca={tiposLicenca.map((x) => ({ id: x.id, nome: x.nome }))}
          />
        </div>
      </Card>
    </div>
  );
}
