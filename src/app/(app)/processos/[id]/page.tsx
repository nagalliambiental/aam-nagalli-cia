import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao, usuarioTemPermissao, requireAuth } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/processos/StatusBadge";
import { formatDate } from "@/lib/format";
import { classificarListaCondicionantes } from "@/lib/condicionantes";
import { statusAmbiental } from "@/lib/status";
import { TarefasPanel } from "@/components/processos/TarefasPanel";
import { SeiSyncPanel } from "@/components/processos/SeiSyncPanel";
import { DeleteProcessoButton } from "@/components/forms/DeleteProcessoButton";
import { filtroSegregacao, filtroProcesso } from "@/lib/segregacao";

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const processoId = Number(id);
  await requirePermissao("processo:ler");
  const podeEditar = await usuarioTemPermissao("processo:editar");
  const podeExcluir = await usuarioTemPermissao("processo:excluir");
  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const podeEditarTudo = user.perfilNome === "Administrador" || user.perfilNome === "Técnico Chefe";
  const podeExcluirTarefa = await usuarioTemPermissao("tarefa:excluir");
  const { scoped, responsavelPessoaId } = await filtroSegregacao();

  const processo = await prisma.processo.findFirst({
    where: { id: processoId, ativo: true, deletedAt: null, ...filtroProcesso(scoped, responsavelPessoaId) },
    include: {
      orgao: true,
      tipoProcesso: true,
      empreendimento: true,
      responsavel: true,
    },
  });

  if (!processo) notFound();

  const statusProcesso = processo.natureza === "ambiental"
    ? statusAmbiental(processo.validade, processo.status, processo.dataLimiteRenovacao, processo.dataProtocolo)
    : processo.status;

  const [tarefas, prazos, exigencias, pessoas] =
    await Promise.all([
      prisma.tarefa.findMany({
        where: { processoId, ativo: true, deletedAt: null, ...(isAdmin ? {} : { visibilidade: "publico" }) },
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
            {([
              ["Número", `#${processo.numero}`],
              ["Natureza", processo.natureza === "ambiental" ? "Ambiental" : "Minerário"],
              ...(processo.natureza === "ambiental"
                ? []
                : [
                    ["NUP (SEI)", processo.nup ?? "—"],
                    ["Fase", processo.fase ?? "—"],
                    ["Área", processo.areaValor != null ? `${processo.areaValor} ${processo.areaUnidade}` : "—"],
                    ["Substâncias", processo.substancias ?? "—"],
                  ]),
              ["Órgão", `${processo.orgao.sigla} — ${processo.orgao.nome}`],
              ["Empreendimento", processo.empreendimento ? (processo.empreendimento.apelido || processo.empreendimento.nome) : "—"],
              ["Responsável", processo.responsavel?.nome ?? "—"],
              ["Status", <StatusBadge key="s" status={statusProcesso} />],
              ["Abertura", formatDate(processo.dataAbertura)],
              ...(processo.natureza === "ambiental"
                ? [
                    ["Nº Licença", processo.numeroLicenca ?? "—"],
                    ["Nº Protocolo", processo.numeroProtocolo ?? "—"],
                    ["Atividade", processo.atividade ?? "—"],
                    ["Modalidade", processo.modalidade === "Outro" ? processo.modalidadeOutra ?? "—" : processo.modalidade ?? "—"],
                    ["Órgão ambiental", processo.orgaoAmbiental === "Outro" ? processo.orgaoAmbientalOutro ?? "—" : processo.orgaoAmbiental ?? "—"],
                    ["Validade", processo.validade ? formatDate(processo.validade) : "—"],
                    ["Data Protocolo", processo.dataProtocolo ? formatDate(processo.dataProtocolo) : "—"],
                    ["Alerta", processo.alertaDias != null ? `${processo.alertaDias} dias` : "—"],
                  ]
                : [["Guia de Utilização", processo.guiaUtilizacao ? "Sim" : "Não"]]),
            ] as [string, React.ReactNode][]).map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-muted">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {processo.descricao && (<div className="border-t border-slate-200 px-5 py-4 text-sm">
              <dt className="font-medium text-muted">Descrição</dt>
              <dd className="mt-1 whitespace-pre-wrap">{processo.descricao}</dd>
            </div>
          )}
          {processo.observacoes && (<div className="border-t border-slate-200 px-5 py-4 text-sm">
              <dt className="font-medium text-muted">Observações</dt>
              <dd className="mt-1 whitespace-pre-wrap">{processo.observacoes}</dd>
            </div>
          )}
          </Card>
          {processo.natureza !== "ambiental" && (
            <div className="mt-6">
              <SeiSyncPanel processoId={processo.id} nup={processo.nup} />
            </div>
          )}
        </>
      ),
    },
    ...(processo.natureza === "ambiental" && processo.condicionantes
      ? [
          {
            id: "condicionantes",
            label: "Condicionantes",
            content: (
              <Card>
                <CardHeader title="Condicionantes" />
                <ul className="divide-y divide-slate-100">
                  {classificarListaCondicionantes(processo.condicionantes).map((item, idx) => (
                    <li key={idx} className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <Badge tone={item.tipo === "exigencia" ? "amber" : "gray"}>
                          {item.tipo === "exigencia" ? "Exigência" : "Informativo"}
                        </Badge>
                        <p className="whitespace-pre-wrap text-sm">{item.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          },
        ]
      : []),
    {
      id: "tarefas",
      label: "Tarefas e Prazos",
      count: tarefas.length,
      content: <TarefasPanel processoId={processo.id} tarefas={tarefas} prazos={prazos} pessoas={pessoas} isAdmin={isAdmin} podeEditarTudo={podeEditarTudo} podeExcluir={podeExcluirTarefa} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          processo.natureza === "ambiental"
            ? [processo.apelido || processo.empreendimento?.apelido || processo.empreendimento?.nome || processo.numero, processo.numeroLicenca].filter(Boolean).join(" · ")
            : `Processo ${processo.numero}`
        }
        subtitle={
          processo.natureza === "ambiental"
            ? `${processo.orgao.sigla} · Fase ${processo.modalidade ?? "—"}${processo.nup ? ` · NUP ${processo.nup}` : ""}`
            : `${processo.orgao.sigla} · Fase ${processo.fase ?? "—"}${processo.nup ? ` · NUP ${processo.nup}` : ""}`
        }
        actions={
          <div className="flex items-center gap-2">
            {podeEditar && (
              <Link href={`/processos/${processo.id}/editar`}>
                <Button variant="secondary">Editar</Button>
              </Link>
            )}
            {podeExcluir && <DeleteProcessoButton id={processo.id} />}
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
