import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contratoId = Number(id);
  await requirePermissao("cadastro:ler");

  const contrato = await prisma.contrato.findFirst({
    where: { id: contratoId, ativo: true, deletedAt: null },
    include: { empresa: true },
  });
  if (!contrato) notFound();

  return (
    <div>
      <PageHeader
        title={contrato.numero ?? `Contrato #${contrato.id}`}
        subtitle={contrato.empresa.nomeFantasia ?? contrato.empresa.razaoSocial}
        actions={
          <>
            <Link href="/contratos">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/contratos/${contrato.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Detalhes" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
          {[
            ["Cliente", contrato.empresa.nomeFantasia ?? contrato.empresa.razaoSocial],
            ["Número", contrato.numero ?? "—"],
            ["Descrição", contrato.descricao ?? "—"],
            ["Assinatura", contrato.dataAssinatura ? formatDate(contrato.dataAssinatura) : "—"],
            ["Validade", contrato.dataValidade ? formatDate(contrato.dataValidade) : "—"],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {contrato.observacoes && (
          <div className="border-t border-slate-200 px-5 py-4 text-sm">
            <dt className="text-muted">Observações</dt>
            <dd className="mt-1 whitespace-pre-wrap">{contrato.observacoes}</dd>
          </div>
        )}
      </Card>
    </div>
  );
}
