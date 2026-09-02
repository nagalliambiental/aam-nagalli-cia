import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ProcessoForm } from "@/components/forms/ProcessoForm";

export default async function EditarProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const processoId = Number(id);
  await requirePermissao("processo:editar");

  const [processo, orgaos, tipos, empreendimentos, pessoas] = await Promise.all([
    prisma.processo.findFirst({ where: { id: processoId, ativo: true, deletedAt: null } }),
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoProcesso.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  if (!processo) notFound();

  return (
    <div>
      <PageHeader title={`Editar processo #${processo.numero}`} subtitle={processo.nup ? `NUP ${processo.nup}` : undefined} />
      <Card>
        <CardHeader title="Dados do processo" />
        <div className="p-5">
          <ProcessoForm
            processoId={processo.id}
            orgaos={orgaos.map((o) => ({ id: o.id, sigla: o.sigla, nome: o.nome }))}
            tipos={tipos.map((t) => ({ id: t.id, nome: t.nome }))}
            empreendimentos={empreendimentos.map((x) => ({ id: x.id, nome: x.nome }))}
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
            initial={{
              numero: processo.numero,
              nup: processo.nup ?? undefined,
              orgaoId: processo.orgaoId,
              responsavelPessoaId: processo.responsavelPessoaId ?? undefined,
              empreendimentoId: processo.empreendimentoId,
              natureza: processo.natureza,
              fase: processo.fase ?? undefined,
              status: processo.status,
              areaValor: processo.areaValor,
              areaUnidade: processo.areaUnidade,
              substancias: processo.substancias ?? undefined,
              guiaUtilizacao: processo.guiaUtilizacao,
              numeroLicenca: processo.numeroLicenca ?? undefined,
              numeroProtocolo: processo.numeroProtocolo ?? undefined,
              atividade: processo.atividade ?? undefined,
              modalidade: processo.modalidade ?? undefined,
              modalidadeOutra: processo.modalidadeOutra ?? undefined,
              orgaoAmbiental: processo.orgaoAmbiental ?? undefined,
              orgaoAmbientalOutro: processo.orgaoAmbientalOutro ?? undefined,
              validade: processo.validade ? processo.validade.toISOString().slice(0, 10) : undefined,
              dataProtocolo: processo.dataProtocolo ? processo.dataProtocolo.toISOString().slice(0, 10) : undefined,
              alertaDias: processo.alertaDias ?? undefined,
              condicionantes: processo.condicionantes ?? undefined,
              dataAbertura: processo.dataAbertura ? processo.dataAbertura.toISOString().slice(0, 10) : undefined,
              descricao: processo.descricao ?? undefined,
              observacoes: processo.observacoes ?? undefined,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
