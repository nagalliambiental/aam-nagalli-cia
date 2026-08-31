import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { TituloForm } from "@/components/forms/TituloForm";

export default async function EditarTituloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tituloId = Number(id);
  await requirePermissao("cadastro:editar");

  const [titulo, orgaos, tiposTitulo, pessoas, processos] = await Promise.all([
    prisma.tituloMinerario.findFirst({
      where: { id: tituloId, ativo: true, deletedAt: null },
      include: { processos: { include: { processo: true } } },
    }),
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoTitulo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.processo.findMany({
      where: { ativo: true, deletedAt: null, status: { notIn: ["cancelado", "arquivado", "encerrado"] } },
      orderBy: { numero: "asc" },
    }),
  ]);
  if (!titulo) notFound();
  const processoVinc = titulo.processos[0]?.processoId;

  return (
    <div>
      <PageHeader title="Editar título minerário" subtitle={titulo.numero} />
      <Card>
        <CardHeader title="Dados do título" />
        <div className="p-5">
          <TituloForm
            tituloId={titulo.id}
            orgaos={orgaos.map((x) => ({ id: x.id, sigla: x.sigla }))}
            tiposTitulo={tiposTitulo.map((x) => ({ id: x.id, nome: x.nome }))}
            pessoas={pessoas.map((x) => ({ id: x.id, nome: x.nome }))}
            processos={processos.map((x) => ({ id: x.id, numero: x.numero }))}
            initial={{
              tipoTituloId: titulo.tipoTituloId,
              numero: titulo.numero,
              orgaoId: titulo.orgaoId,
              processoId: processoVinc ?? undefined,
              substancia: titulo.substancia ?? undefined,
              municipio: titulo.municipio ?? undefined,
              uf: titulo.uf ?? undefined,
              dataEmissao: titulo.dataEmissao ? titulo.dataEmissao.toISOString().slice(0, 10) : undefined,
              validade: titulo.validade ? titulo.validade.toISOString().slice(0, 10) : undefined,
              situacao: titulo.situacao ?? undefined,
              observacoes: titulo.observacoes ?? undefined,
              responsavelPessoaId: titulo.responsavelPessoaId ?? null,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
