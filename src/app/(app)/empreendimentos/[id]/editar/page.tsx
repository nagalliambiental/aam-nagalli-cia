import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { EmpreendimentoForm } from "@/components/forms/EmpreendimentoForm";

export default async function EditarEmpreendimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empreendimentoId = Number(id);
  await requirePermissao("cadastro:editar");

  const [empreendimento, empresas] = await Promise.all([
    prisma.empreendimento.findFirst({
      where: { id: empreendimentoId, ativo: true, deletedAt: null },
    }),
    prisma.empresa.findMany({
      where: { ativo: true, deletedAt: null },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);
  if (!empreendimento) notFound();

  return (
    <div>
      <PageHeader title="Editar empreendimento" subtitle={empreendimento.nome} />
      <Card>
        <CardHeader title="Dados do empreendimento" />
        <div className="p-5">
          <EmpreendimentoForm
            empreendimentoId={empreendimento.id}
            empresas={empresas.map((x) => ({ id: x.id, razaoSocial: x.razaoSocial }))}
            initial={{
              nome: empreendimento.nome,
              tipo: empreendimento.tipo ?? undefined,
              municipio: empreendimento.municipio ?? undefined,
              uf: empreendimento.uf ?? undefined,
              endereco: empreendimento.endereco ?? undefined,
              status: empreendimento.status ?? undefined,
              descricao: empreendimento.descricao ?? undefined,
              observacoes: empreendimento.observacoes ?? undefined,
              empresaPrincipalId: empreendimento.empresaPrincipalId,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
