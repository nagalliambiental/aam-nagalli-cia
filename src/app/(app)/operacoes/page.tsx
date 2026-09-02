import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader } from "@/components/ui";
import { OperacoesView } from "@/components/processos/OperacoesView";
import { filtroSegregacao, filtroProcesso } from "@/lib/segregacao";

export default async function OperacoesPage() {
  await requirePermissao("processo:ler");
  const { scoped, responsavelPessoaId } = await filtroSegregacao();
  const procWhere = { ativo: true, deletedAt: null, ...filtroProcesso(scoped, responsavelPessoaId) };

  const [prazos, tarefas, pessoas] = await Promise.all([
    prisma.prazo.findMany({
      where: { ativo: true, deletedAt: null, status: { notIn: ["concluido", "cancelado"] }, processo: procWhere },
      orderBy: { dataCalculadaAtual: "asc" },
      select: {
        id: true, descricao: true, status: true, dataInicial: true, dataCalculadaAtual: true, alertaDias: true,
        processo: { select: { numero: true } },
      },
    }),
    prisma.tarefa.findMany({
      where: { ativo: true, deletedAt: null, status: { notIn: ["concluida"] }, processo: procWhere },
      orderBy: { prazoData: "asc" },
      select: { id: true, titulo: true, status: true, prazoData: true, responsavel: { select: { nome: true } } },
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Prazos & Calendário"
        subtitle="Prazos, tarefas e alertas em um só lugar"
      />
      <OperacoesView
        prazos={prazos.map((p) => ({
          id: p.id,
          descricao: p.descricao,
          status: p.status,
          dataInicial: p.dataInicial.toISOString(),
          dataCalculadaAtual: p.dataCalculadaAtual ? p.dataCalculadaAtual.toISOString() : null,
          alertaDias: p.alertaDias,
          processoNumero: p.processo?.numero ?? null,
        }))}
        tarefas={tarefas.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          status: t.status,
          prazoData: t.prazoData ? t.prazoData.toISOString() : null,
          responsavelNome: t.responsavel?.nome ?? null,
        }))}
      />
    </div>
  );
}
