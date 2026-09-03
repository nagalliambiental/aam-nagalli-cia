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
    include: { contatos: { where: { ativo: true, deletedAt: null }, orderBy: { id: "asc" } } },
  });

  if (!empresa) notFound();

  return (
    <div>
      <PageHeader title="Editar cliente" subtitle={empresa.razaoSocial} />
      <Card>
        <CardHeader title="Dados do cliente" />
        <div className="p-5">
          <EmpresaForm
            empresaId={empresa.id}
            initial={{
              razaoSocial: empresa.razaoSocial,
              nomeFantasia: empresa.nomeFantasia ?? undefined,
              apelido: empresa.apelido ?? undefined,
              cnpj: empresa.cnpj ?? undefined,
              inscricaoEstadual: empresa.inscricaoEstadual ?? undefined,
              email: empresa.email ?? undefined,
              telefone: empresa.telefone ?? undefined,
              endereco: empresa.endereco ?? undefined,
              numeroEndereco: empresa.numeroEndereco ?? undefined,
              municipio: empresa.municipio ?? undefined,
              uf: empresa.uf ?? undefined,
              cep: empresa.cep ?? undefined,
              observacoes: empresa.observacoes ?? undefined,
              contatos: empresa.contatos.map((c) => ({ nome: c.nome ?? "", email: c.email ?? "", telefone: c.telefone ?? "", assunto: c.assunto ?? "" })),
            }}
          />
        </div>
      </Card>
    </div>
  );
}
