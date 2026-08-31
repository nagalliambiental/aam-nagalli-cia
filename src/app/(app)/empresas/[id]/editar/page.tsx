import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { EmpresaForm } from "@/components/forms/EmpresaForm";

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresaId = Number(id);
  await requirePermissao("cadastro:editar");

  const empresa = await prisma.empresa.findFirst({
    where: { id: empresaId, ativo: true, deletedAt: null },
  });

  if (!empresa) notFound();

  return (
    <div>
      <PageHeader title="Editar empresa" subtitle={empresa.razaoSocial} />
      <Card>
        <CardHeader title="Dados da empresa" />
        <div className="p-5">
          <EmpresaForm
            empresaId={empresa.id}
            initial={{
              razaoSocial: empresa.razaoSocial,
              nomeFantasia: empresa.nomeFantasia ?? undefined,
              apelido: (empresa as Record<string, unknown>).apelido as string ?? undefined,
              cnpj: empresa.cnpj ?? undefined,
              inscricaoEstadual: empresa.inscricaoEstadual ?? undefined,
              email: empresa.email ?? undefined,
              telefone: empresa.telefone ?? undefined,
              endereco: empresa.endereco ?? undefined,
              municipio: empresa.municipio ?? undefined,
              uf: empresa.uf ?? undefined,
              cep: empresa.cep ?? undefined,
              observacoes: empresa.observacoes ?? undefined,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
