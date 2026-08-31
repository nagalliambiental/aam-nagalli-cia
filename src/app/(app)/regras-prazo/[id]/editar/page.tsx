import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { RegraPrazoForm } from "@/components/forms/RegraPrazoForm";

export default async function EditarRegraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const regraId = Number(id);
  await requirePermissao("config:editar");

  const [regra, orgaos, tiposProcesso, tiposEvento, tiposTitulo, tiposLicenca] = await Promise.all([
    prisma.regraPrazo.findUnique({ where: { id: regraId } }),
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoProcesso.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tipoEvento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tipoTitulo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tipoLicenca.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  if (!regra) notFound();

  return (
    <div>
      <PageHeader title="Editar regra de prazo" subtitle="Regra de automação" />
      <Card>
        <CardHeader title="Definição da regra" />
        <div className="p-5">
          <RegraPrazoForm
            regraId={regra.id}
            orgaos={orgaos.map((x) => ({ id: x.id, sigla: x.sigla }))}
            tiposProcesso={tiposProcesso.map((x) => ({ id: x.id, nome: x.nome }))}
            tiposEvento={tiposEvento.map((x) => ({ id: x.id, nome: x.nome }))}
            tiposTitulo={tiposTitulo.map((x) => ({ id: x.id, nome: x.nome }))}
            tiposLicenca={tiposLicenca.map((x) => ({ id: x.id, nome: x.nome }))}
            initial={{
              orgaoId: regra.orgaoId,
              tipoProcessoId: regra.tipoProcessoId ?? null,
              tipoEventoId: regra.tipoEventoId ?? null,
              tipoTituloId: regra.tipoTituloId ?? null,
              tipoLicencaId: regra.tipoLicencaId ?? null,
              fase: regra.fase ?? undefined,
              condicao: regra.condicao ?? undefined,
              quantidade: regra.quantidade,
              unidade: regra.unidade,
              dataFixa: regra.dataFixa ? regra.dataFixa.toISOString().slice(0, 10) : undefined,
              acaoGerada: regra.acaoGerada ?? undefined,
              tarefaGerada: regra.tarefaGerada ?? undefined,
              antecedenciaNotificacao: regra.antecedenciaNotificacao ?? undefined,
              ativo: regra.ativo,
              vigenciaFim: regra.vigenciaFim ? regra.vigenciaFim.toISOString().slice(0, 10) : undefined,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
