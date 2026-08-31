import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";
import { EmpresaForm } from "@/components/forms/EmpresaForm";
import { formatCNPJ } from "@/lib/format";
import { DeleteEmpresaButton } from "@/components/forms/DeleteEmpresaButton";

export default async function EmpresaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresaId = Number(id);
  await requirePermissao("cadastro:ler");

  const empresa = await prisma.empresa.findFirst({
    where: { id: empresaId, ativo: true, deletedAt: null },
    include: {
      _count: { select: { processos: true, empreendimentosPrincipais: true, pessoas: true } },
    },
  });

  if (!empresa) notFound();

  const podeEditar = await prisma.permissao.findFirst({
    where: { chave: "cadastro:editar" },
  });

  return (
    <div>
      <PageHeader
        title={empresa.razaoSocial}
        subtitle={empresa.apelido ? `${empresa.apelido} · ${empresa.nomeFantasia ?? "Sem nome fantasia"}` : empresa.nomeFantasia ?? "Sem nome fantasia"}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/empresas">
              <Button variant="ghost">Voltar</Button>
            </Link>
            {podeEditar && (
              <Link href={`/empresas/${empresa.id}/editar`}>
                <Button>Editar</Button>
              </Link>
            )}
            <DeleteEmpresaButton id={empresa.id} />
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Dados gerais" />
          <dl className="space-y-3 px-5 py-4 text-sm">
            {[
              ["Apelido", empresa.apelido ?? "—"],
              ["CNPJ", empresa.cnpj ? formatCNPJ(empresa.cnpj) : "—"],
              ["Inscrição estadual", empresa.inscricaoEstadual ?? "—"],
              ["E-mail", empresa.email ?? "—"],
              ["Telefone", empresa.telefone ?? "—"],
              ["Município/UF", empresa.municipio && empresa.uf ? `${empresa.municipio}/${empresa.uf}` : "—"],
              ["Endereço", empresa.endereco ?? "—"],
              ["Status", <Badge key="s" tone={empresa.ativo ? "green" : "gray"}>{empresa.ativo ? "ativo" : "inativo"}</Badge>],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium text-right">{v}</dd>
              </div>
            ))}
            {empresa.observacoes && (
              <div>
                <dt className="text-muted">Observações</dt>
                <dd className="mt-1 whitespace-pre-wrap">{empresa.observacoes}</dd>
              </div>
            )}
          </dl>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Contadores" />
            <dl className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
              {[
                ["Processos", empresa._count.processos],
                ["Empreendimentos", empresa._count.empreendimentosPrincipais],
                ["Pessoas vinculadas", empresa._count.pessoas],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="mt-1 text-2xl font-bold text-navy-900">{v as number}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
