import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";

export default async function RegraDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const regraId = Number(id);
  await requirePermissao("config:ler");

  const regra = await prisma.regraPrazo.findUnique({
    where: { id: regraId },
    include: {
      orgao: true,
      tipoProcesso: true,
      tipoEvento: true,
      tipoTitulo: true,
      tipoLicenca: true,
      _count: { select: { prazosAplicados: true } },
    },
  });
  if (!regra) notFound();

  return (
    <div>
      <PageHeader
        title={`Regra de prazo #${regra.id}`}
        subtitle={`${regra.orgao.sigla}${regra.tipoProcesso ? ` · ${regra.tipoProcesso.nome}` : ""}`}
        actions={
          <>
            <Link href="/regras-prazo">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/regras-prazo/${regra.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Detalhes da regra" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
          {[
            ["Órgão", `${regra.orgao.sigla} — ${regra.orgao.nome}`],
            ["Tipo de processo", regra.tipoProcesso?.nome ?? "(qualquer)"],
            ["Tipo de evento", regra.tipoEvento?.nome ?? "(qualquer)"],
            ["Tipo de título", regra.tipoTitulo?.nome ?? "(qualquer)"],
            ["Tipo de licença", regra.tipoLicenca?.nome ?? "(qualquer)"],
            ["Fase", regra.fase ?? "—"],
            ["Condição", regra.condicao ?? "—"],
            ["Prazo", regra.dataFixa
              ? `data fixa ${regra.dataFixa.toLocaleDateString("pt-BR")}`
              : `${regra.quantidade} ${regra.unidade}`],
            ["Ação gerada", regra.acaoGerada ?? "—"],
            ["Tarefa gerada", regra.tarefaGerada ?? "—"],
            ["Antecedência notificação", regra.antecedenciaNotificacao ? `${regra.antecedenciaNotificacao} dias` : "—"],
            ["Prazos aplicados", String(regra._count.prazosAplicados)],
            ["Versão", `v${regra.versao}`],
            ["Status", <Badge key="s" tone={regra.ativo ? "green" : "gray"}>{regra.ativo ? "ativa" : "inativa"}</Badge>],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
