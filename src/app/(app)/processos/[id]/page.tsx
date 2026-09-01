import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button } from "@/components/ui";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/processos/StatusBadge";
import { formatDate } from "@/lib/format";
import { TarefasPanel } from "@/components/processos/TarefasPanel";
import { PrazosPanel } from "@/components/processos/PrazosPanel";
import { ExigenciasPanel } from "@/components/processos/ExigenciasPanel";
import { ComunicacoesPanel } from "@/components/processos/ComunicacoesPanel";
import { CustosPanel } from "@/components/processos/CustosPanel";
import { SeiSyncPanel } from "@/components/processos/SeiSyncPanel";
import { DeleteProcessoButton } from "@/components/forms/DeleteProcessoButton";

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const processoId = Number(id);
  await requirePermissao("processo:ler");

  const processo = await prisma.processo.findFirst({
    where: { id: processoId, ativo: true, deletedAt: null },
    include: {
      orgao: true,
      tipoProcesso: true,
      empreendimento: true,
    },
  });

  if (!processo) notFound();

  const [tarefas, prazos, exigencias, pessoas, comunicacoes, custos] =
    await Promise.all([
      prisma.tarefa.findMany({
        where: { processoId, ativo: true, deletedAt: null },
        orderBy: { dataCriacao: "desc" },
        include: { responsavel: true },
      }),
      prisma.prazo.findMany({
        where: { processoId, ativo: true, deletedAt: null },
        orderBy: { dataCalculadaAtual: "asc" },
      }),
      prisma.exigencia.findMany({
        where: { processoId, ativo: true, deletedAt: null },
        orderBy: { dataRecebimento: "desc" },
        include: { orgao: true, responsavel: true },
      }),
      prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
      prisma.comunicacao.findMany({
        where: { processoId, ativo: true, deletedAt: null },
        orderBy: { data: "desc" },
      }),
      prisma.custo.findMany({
        where: { processoId, ativo: true, deletedAt: null },
        orderBy: { data: "desc" },
        include: { responsavel: true },
      }),
    ]);

  const tabs = [
    {
      id: "resumo",
      label: "Resumo",
      content: (
        <>
          <Card>
            <CardHeader title="Informações do processo" />
            <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
            {[
              ["Número", `#${processo.numero}`],
              ["NUP (SEI)", processo.nup ?? "—"],
              ["Órgão", `${processo.orgao.sigla} — ${processo.orgao.nome}`],
              ["Tipo", processo.tipoProcesso.nome],
              ["Empreendimento", processo.empreendimento?.nome ?? "—"],
              ["Assunto", processo.assunto ?? "—"],
              ["Fase", processo.fase ?? "—"],
              ["Área", processo.areaValor != null ? `${processo.areaValor} ${processo.areaUnidade}` : "—"],
              ["Substâncias", processo.substancias ?? "—"],
              ["Status", <StatusBadge key="s" status={processo.status} />],
              ["Abertura", formatDate(processo.dataAbertura)],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-muted">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {processo.descricao && (
            <div className="border-t border-slate-200 px-5 py-4 text-sm">
              <dt className="font-medium text-muted">Descrição</dt>
              <dd className="mt-1 whitespace-pre-wrap">{processo.descricao}</dd>
            </div>
          )}
          {processo.observacoes && (
            <div className="border-t border-slate-200 px-5 py-4 text-sm">
              <dt className="font-medium text-muted">Observações</dt>
              <dd className="mt-1 whitespace-pre-wrap">{processo.observacoes}</dd>
            </div>
          )}
          </Card>
          <div className="mt-6">
            <SeiSyncPanel processoId={processo.id} nup={processo.nup} />
          </div>
        </>
      ),
    },
    {
      id: "tarefas",
      label: "Tarefas",
      count: tarefas.length,
      content: <TarefasPanel processoId={processo.id} tarefas={tarefas} pessoas={pessoas} />,
    },
    {
      id: "prazos",
      label: "Prazos",
      count: prazos.length,
      content: <PrazosPanel prazos={prazos} />,
    },
    {
      id: "exigencias",
      label: "Exigências",
      count: exigencias.length,
      content: <ExigenciasPanel processoId={processo.id} exigencias={exigencias} pessoas={pessoas} />,
    },
    {
      id: "comunicacoes",
      label: "Comunicações",
      count: comunicacoes.length,
      content: (
        <ComunicacoesPanel processoId={processo.id} comunicacoes={comunicacoes} />
      ),
    },
    {
      id: "custos",
      label: "Custos",
      count: custos.length,
      content: <CustosPanel processoId={processo.id} custos={custos} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Processo #${processo.numero}`}
        subtitle={`${processo.orgao.sigla} · ${processo.tipoProcesso.nome}${processo.nup ? ` · NUP ${processo.nup}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/processos/${processo.id}/editar`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <DeleteProcessoButton id={processo.id} />
            <Link href="/processos">
              <Button variant="ghost">Voltar</Button>
            </Link>
          </div>
        }
      />

      <Tabs
        defaultId="resumo"
        tabs={tabs.map(({ id, label, count }) => ({ id, label, count }))}
      >
        {tabs.map((t) => t.content)}
      </Tabs>
    </div>
  );
}
