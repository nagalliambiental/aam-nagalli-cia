import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { LicencaForm } from "@/components/forms/LicencaForm";

export default async function EditarLicencaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const licencaId = Number(id);
  await requirePermissao("cadastro:editar");

  const [licenca, orgaos, tiposLicenca, empreendimentos, pessoas] = await Promise.all([
    prisma.licenca.findFirst({ where: { id: licencaId, ativo: true, deletedAt: null } }),
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoLicenca.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);
  if (!licenca) notFound();

  return (
    <div>
      <PageHeader title="Editar licença" subtitle={licenca.numero} />
      <Card>
        <CardHeader title="Dados da licença" />
        <div className="p-5">
          <LicencaForm
            licencaId={licenca.id}
            orgaos={orgaos.map((x) => ({ id: x.id, sigla: x.sigla }))}
            tiposLicenca={tiposLicenca.map((x) => ({ id: x.id, nome: x.nome }))}
            empreendimentos={empreendimentos.map((x) => ({ id: x.id, nome: x.nome }))}
            pessoas={pessoas.map((x) => ({ id: x.id, nome: x.nome }))}
            initial={{
              tipoLicencaId: licenca.tipoLicencaId,
              numero: licenca.numero,
              orgaoId: licenca.orgaoId,
              empreendimentoId: licenca.empreendimentoId ?? null,
              dataEmissao: licenca.dataEmissao ? licenca.dataEmissao.toISOString().slice(0, 10) : undefined,
              dataValidade: licenca.dataValidade ? licenca.dataValidade.toISOString().slice(0, 10) : undefined,
              situacao: licenca.situacao,
              observacoes: licenca.observacoes ?? undefined,
              responsavelPessoaId: licenca.responsavelPessoaId ?? null,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
