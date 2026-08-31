import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PessoaForm } from "@/components/forms/PessoaForm";

export default async function EditarPessoaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pessoaId = Number(id);
  await requirePermissao("cadastro:editar");

  const pessoa = await prisma.pessoa.findFirst({
    where: { id: pessoaId, ativo: true, deletedAt: null },
  });
  if (!pessoa) notFound();

  return (
    <div>
      <PageHeader title="Editar pessoa" subtitle={pessoa.nome} />
      <Card>
        <CardHeader title="Dados da pessoa" />
        <div className="p-5">
          <PessoaForm
            pessoaId={pessoa.id}
            initial={{
              nome: pessoa.nome,
              documento: pessoa.documento ?? undefined,
              tipoPessoa: pessoa.tipoPessoa ?? undefined,
              email: pessoa.email ?? undefined,
              telefone: pessoa.telefone ?? undefined,
              endereco: pessoa.endereco ?? undefined,
              cep: pessoa.cep ?? undefined,
              observacoes: pessoa.observacoes ?? undefined,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
