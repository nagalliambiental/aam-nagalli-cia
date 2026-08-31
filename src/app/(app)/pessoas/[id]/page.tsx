import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";
import { PessoaForm } from "@/components/forms/PessoaForm";

export default async function PessoaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pessoaId = Number(id);
  await requirePermissao("cadastro:ler");

  const pessoa = await prisma.pessoa.findFirst({
    where: { id: pessoaId, ativo: true, deletedAt: null },
    include: {
      _count: {
        select: {
          processosResp: true,
          tarefasResp: true,
          titulosResp: true,
          licencasResp: true,
        },
      },
    },
  });

  if (!pessoa) notFound();

  return (
    <div>
      <PageHeader
        title={pessoa.nome}
        subtitle={pessoa.email ?? "Sem e-mail"}
        actions={
          <>
            <Link href="/pessoas">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/pessoas/${pessoa.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Dados gerais" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
          {[
            ["Tipo", pessoa.tipoPessoa === "fisica" ? "Pessoa física" : "Pessoa jurídica"],
            ["Documento", pessoa.documento ?? "—"],
            ["E-mail", pessoa.email ?? "—"],
            ["Telefone", pessoa.telefone ?? "—"],
            ["Endereço", pessoa.endereco ?? "—"],
            ["CEP", pessoa.cep ?? "—"],
            ["Status", <Badge key="s" tone={pessoa.ativo ? "green" : "gray"}>{pessoa.ativo ? "ativo" : "inativo"}</Badge>],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {pessoa.observacoes && (
          <div className="border-t border-slate-200 px-5 py-4 text-sm">
            <dt className="font-medium text-muted">Observações</dt>
            <dd className="mt-1 whitespace-pre-wrap">{pessoa.observacoes}</dd>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 px-5 py-4 md:grid-cols-4">
          {[
            ["Processos", pessoa._count.processosResp],
            ["Tarefas", pessoa._count.tarefasResp],
            ["Títulos", pessoa._count.titulosResp],
            ["Licenças", pessoa._count.licencasResp],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-2xl font-bold text-navy-900">{v as number}</dd>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
