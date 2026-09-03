import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button } from "@/components/ui";
import { Search } from "lucide-react";
import { NovaTarefaBotao } from "@/components/processos/NovaTarefaBotao";
import { ImportarTarefas } from "@/components/processos/ImportarTarefas";
import { LinhaTarefa } from "@/components/processos/LinhaTarefa";
import { usuarioTemPermissao, requireAuth } from "@/lib/perfil";
import { filtroSegregacao, filtroProcesso } from "@/lib/segregacao";

type SearchParams = Promise<{ q?: string | string[]; status?: string | string[] }>;

export default async function TarefasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const verConcluidas = typeof sp.status === "string" && sp.status === "concluida";
  const podeCriar = await usuarioTemPermissao("tarefa:criar");
  const podeExcluir = await usuarioTemPermissao("tarefa:excluir");
  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const podeEditarTudo = user.perfilNome === "Administrador" || user.perfilNome === "Técnico Chefe";
  const { scoped, responsavelPessoaId } = await filtroSegregacao();

  const statusFilter = verConcluidas
    ? { status: "concluida" as const }
    : { status: { notIn: ["concluida"] as string[] } };

  const escopoTarefa = scoped && responsavelPessoaId
    ? { OR: [{ processo: { responsavelPessoaId } }, { responsavelPessoaId }] }
    : {};

  const [tarefas, pessoas, empreendimentos] = await Promise.all([
    prisma.tarefa.findMany({
      where: { ativo: true, deletedAt: null, ...(isAdmin ? {} : { visibilidade: "publico" }), ...escopoTarefa, ...statusFilter, ...(q ? { titulo: { contains: q, mode: "insensitive" as const } } : {}) },
      orderBy: [{ status: "asc" }, { prazoData: "asc" }],
      include: { responsavel: true, processo: { include: { orgao: true } }, empreendimento: true },
      take: 200,
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({
      where: { ativo: true, deletedAt: null },
      orderBy: { nome: "asc" },
      include: { processos: { where: { ativo: true, deletedAt: null, ...filtroProcesso(scoped, responsavelPessoaId) }, select: { id: true, numero: true } } },
    }),
  ]);

  const empreendimentosOpt = empreendimentos.map((e) => ({
    id: e.id,
    nome: e.nome,
    apelido: e.apelido,
    processos: e.processos.map((p) => ({ id: p.id, numero: p.numero })),
  }));

  return (
    <div>
      <PageHeader
        title="Tarefas"
        subtitle="Tarefas e suas exigências vinculadas"
        actions={podeCriar ? <ImportarTarefas /> : undefined}
      />

      {podeCriar && (
        <NovaTarefaBotao
          pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
          empreendimentos={empreendimentosOpt}
          isAdmin={isAdmin}
        />
      )}

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-200 p-4">
          <Link href="/tarefas" className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${!verConcluidas ? "bg-navy-100 text-navy-800" : "text-muted hover:bg-slate-100"}`}>
            Em aberto
          </Link>
          <Link href="/tarefas?status=concluida" className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${verConcluidas ? "bg-emerald-50 text-emerald-800" : "text-muted hover:bg-slate-100"}`}>
            Concluídas
          </Link>
          <form method="get" className="ml-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por título..."
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
              />
            </div>
            <Button type="submit" variant="secondary" className="px-3 py-1.5">Buscar</Button>
          </form>
        </div>
        <ul className="divide-y divide-slate-100">
          {tarefas.map((t) => (
            <li key={t.id}>
              <LinhaTarefa
                tarefa={{
                  id: t.id,
                  titulo: t.titulo,
                  descricao: t.descricao,
                  prazoData: t.prazoData ? t.prazoData.toISOString().slice(0, 10) : null,
                  dataLimite: t.dataLimite ? t.dataLimite.toISOString().slice(0, 10) : null,
                  alertaDias: t.alertaDias,
                  alertaDataLimite: t.alertaDataLimite,
                  prioridade: t.prioridade,
                  status: t.status,
                  responsavelPessoaId: t.responsavelPessoaId,
                  visibilidade: t.visibilidade,
                  responsavelNome: t.responsavel.nome,
                  processoLabel: t.processo ? `Processo: #${t.processo.numero} (${t.processo.orgao.sigla})` : "Processo: — sem vínculo —",
                }}
                pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
                isAdmin={isAdmin}
                podeEditarTudo={podeEditarTudo}
                podeExcluir={podeExcluir}
              />
            </li>
          ))}
          {tarefas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              {verConcluidas ? "Nenhuma tarefa concluída." : "Nenhuma tarefa em aberto."}
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
