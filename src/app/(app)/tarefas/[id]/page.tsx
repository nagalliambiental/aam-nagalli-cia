import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao, usuarioTemPermissao, requireAuth } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";
import { TarefaEdicaoForm } from "@/components/processos/TarefaEdicaoForm";
import { TarefaExcluirBotao } from "@/components/processos/TarefaExcluirBotao";
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
  await requirePermissao("tarefa:editar");
  const podeExcluir = await usuarioTemPermissao("tarefa:excluir");
  const user = await requireAuth();
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
    </div>
  );
}
