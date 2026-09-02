import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";
import { TarefaEdicaoForm } from "@/components/processos/TarefaEdicaoForm";
import { formatDate } from "@/lib/format";

const TAREFA_STATUS: Record<string, { label: string; tone: "blue" | "green" | "amber" }> = {
  pendente: { label: "Pendente", tone: "amber" },
  em_andamento: { label: "Em andamento", tone: "blue" },
  concluida: { label: "Concluída", tone: "green" },
};

export default async function TarefaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarefaId = Number(id);
  await requirePermissao("tarefa:editar");

  const [tarefa, pessoas, empreendimentos] = await Promise.all([
    prisma.tarefa.findFirst({
      where: { id: tarefaId, ativo: true, deletedAt: null },
      include: { responsavel: true, processo: { include: { orgao: true } }, empreendimento: true },
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({
      where: { ativo: true, deletedAt: null },
      orderBy: { nome: "asc" },
      include: { processos: { where: { ativo: true, deletedAt: null }, select: { id: true, numero: true } } },
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
            empreendimentos={empreendimentos.map((e) => ({
              id: e.id,
              nome: e.nome,
              processos: e.processos.map((p) => ({ id: p.id, numero: p.numero })),
            }))}
            initial={{
              titulo: tarefa.titulo,
              descricao: tarefa.descricao,
              observacoes: tarefa.observacoes,
              status: tarefa.status,
              prioridade: tarefa.prioridade,
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
