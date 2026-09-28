import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioTemPermissao, requireAuth } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";
import { TarefaEdicaoForm } from "@/components/processos/TarefaEdicaoForm";
import { TarefaExcluirBotao } from "@/components/processos/TarefaExcluirBotao";
import { TarefaAnexos } from "@/components/processos/TarefaAnexos";
import { formatDate } from "@/lib/format";

const TAREFA_STATUS: Record<string, { label: string; tone: "blue" | "green" | "amber" | "gray" | "gold" }> = {
  nao_iniciado: { label: "Não Iniciado", tone: "gray" },
  em_andamento: { label: "Em andamento", tone: "blue" },
  concluida: { label: "Concluído", tone: "green" },
  para_revisao: { label: "Para Revisão", tone: "gold" },
};

export default async function TarefaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarefaId = Number(id);
  const user = await requireAuth();
  const podeEditar = await usuarioTemPermissao("tarefa:editar");
  const podeExcluir = await usuarioTemPermissao("tarefa:excluir");
  const isAdmin = user.perfilNome === "Administrador";

  const [tarefa, pessoas, empreendimentos, processosAmbientais] = await Promise.all([
    prisma.tarefa.findFirst({
      where: { id: tarefaId, ativo: true, deletedAt: null, ...(isAdmin ? {} : { visibilidade: "publico" }) },
      include: { responsavel: true, processo: { include: { orgao: true } }, empreendimento: true },
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({
      where: { ativo: true, deletedAt: null },
      orderBy: { nome: "asc" },
      include: {
        processos: { where: { ativo: true, deletedAt: null }, select: { id: true, numero: true, natureza: true } },
        licencas: {
          where: { ativo: true, deletedAt: null },
          select: { processos: { select: { processo: { select: { id: true, numero: true, apelido: true, numeroLicenca: true, natureza: true, ativo: true, deletedAt: true } } } } },
        },
      },
    }),
    prisma.processo.findMany({
      where: { ativo: true, deletedAt: null, natureza: "ambiental" },
      orderBy: { apelido: "asc" },
      select: { id: true, numero: true, apelido: true, numeroLicenca: true },
    }),
  ]);

  if (!tarefa) notFound();

  const st = TAREFA_STATUS[tarefa.status] ?? { label: tarefa.status, tone: "gray" as const };

  return (
    <div>
      <PageHeader
        title={`Tarefa #${tarefa.id}`}
        subtitle={tarefa.titulo}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            {podeExcluir && <TarefaExcluirBotao tarefaId={tarefa.id} />}
            <Link href="/tarefas">
              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-navy-600 ring-1 ring-slate-200 hover:bg-slate-100">Voltar</span>
            </Link>
          </div>
        }
      />

      {podeEditar ? (
        <Card>
          <CardHeader title="Editar tarefa" />
          <div className="p-1">
            <TarefaEdicaoForm
              tarefaId={tarefa.id}
              pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
              empreendimentos={empreendimentos.map((e) => {
                const vinculados = new Map<number, { id: number; numero: string; apelido: string | null; numeroLicenca: string | null }>();
                for (const p of e.processos.filter((p) => p.natureza === "ambiental")) {
                  vinculados.set(p.id, { id: p.id, numero: p.numero, apelido: null, numeroLicenca: null });
                }
                for (const l of e.licencas) {
                  for (const x of l.processos) {
                    const p = x.processo;
                    if (p.ativo && !p.deletedAt && !vinculados.has(p.id)) {
                      vinculados.set(p.id, { id: p.id, numero: p.numero, apelido: p.apelido, numeroLicenca: p.numeroLicenca });
                    }
                  }
                }
                return {
                  id: e.id,
                  nome: e.nome,
                  apelido: e.apelido,
                  processos: e.processos.filter((p) => p.natureza !== "ambiental").map((p) => ({ id: p.id, numero: p.numero })),
                  processosAmbientais: [...vinculados.values()],
                };
              })}
              processosAmbientais={processosAmbientais}
              showVisibilidade={isAdmin}
              initial={{
                titulo: tarefa.titulo,
                descricao: tarefa.descricao,
                observacoes: tarefa.observacoes,
                status: tarefa.status,
                prioridade: tarefa.prioridade,
                visibilidade: tarefa.visibilidade,
                responsavelPessoaId: tarefa.responsavelPessoaId,
                empreendimentoId: tarefa.empreendimentoId,
                processoId: tarefa.processoId,
                prazoData: tarefa.prazoData ? tarefa.prazoData.toISOString().slice(0, 10) : null,
                alertaDias: tarefa.alertaDias,
              }}
            />
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Detalhes da tarefa" subtitle="Somente leitura" />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Título</dt>
              <dd className="font-medium text-navy-900">{tarefa.titulo}</dd>
            </div>
            {tarefa.descricao && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Descrição</dt>
                <dd className="whitespace-pre-wrap text-navy-800">{tarefa.descricao}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Status</dt>
              <dd><Badge tone={st.tone}>{st.label}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Prioridade</dt>
              <dd className="capitalize text-navy-800">{tarefa.prioridade}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Responsável pela Execução</dt>
              <dd className="text-navy-800">{tarefa.responsavel?.nome ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Prazo Final</dt>
              <dd className="text-navy-800">{tarefa.prazoData ? formatDate(tarefa.prazoData) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Limite de Execução Serviço</dt>
              <dd className="text-navy-800">{tarefa.dataLimite ? formatDate(tarefa.dataLimite) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Empreendimento</dt>
              <dd className="text-navy-800">
                {tarefa.empreendimento ? (tarefa.empreendimento.apelido || tarefa.empreendimento.nome) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Processo</dt>
              <dd className="text-navy-800">
                {tarefa.processo ? `#${tarefa.processo.numero} (${tarefa.processo.orgao.sigla})` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Visibilidade</dt>
              <dd className="capitalize text-navy-800">{tarefa.visibilidade === "publico" ? "Pública" : "Privada"}</dd>
            </div>
            {tarefa.dataConclusao && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Concluída em</dt>
                <dd className="text-navy-800">{formatDate(tarefa.dataConclusao)}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader title="Anexos" subtitle="Arquivos enviados para esta tarefa" />
        <div className="p-4">
          <TarefaAnexos tarefaId={tarefa.id} />
        </div>
      </Card>
    </div>
  );
}
