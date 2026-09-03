import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ContratoForm } from "@/components/forms/ContratoForm";

export default async function EditarContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contratoId = Number(id);
  await requirePermissao("cadastro:editar");

  const [contrato, empresas] = await Promise.all([
    prisma.contrato.findFirst({ where: { id: contratoId, ativo: true, deletedAt: null } }),
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { razaoSocial: "asc" } }),
  ]);
  if (!contrato) notFound();

  return (
    <div>
      <PageHeader title="Editar contrato" subtitle={contrato.numero ?? `#${contrato.id}`} />
      <Card>
        <CardHeader title="Dados do contrato" />
        <div className="p-5">
          <ContratoForm
            contratoId={contrato.id}
            empresas={empresas.map((x) => ({ id: x.id, nome: x.nomeFantasia || x.apelido || x.razaoSocial }))}
            initial={{
              empresaId: contrato.empresaId,
              numero: contrato.numero ?? undefined,
              descricao: contrato.descricao ?? undefined,
              dataAssinatura: contrato.dataAssinatura ? contrato.dataAssinatura.toISOString().slice(0, 10) : undefined,
              dataValidade: contrato.dataValidade ? contrato.dataValidade.toISOString().slice(0, 10) : undefined,
              observacoes: contrato.observacoes ?? undefined,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
