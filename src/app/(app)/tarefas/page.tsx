import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button } from "@/components/ui";
import { Search, RefreshCw } from "lucide-react";
import { NovaTarefaBotao } from "@/components/processos/NovaTarefaBotao";
import { TarefaEmMassa } from "@/components/processos/TarefaEmMassa";
import { ImportarTarefas } from "@/components/processos/ImportarTarefas";
import { LinhaTarefa } from "@/components/processos/LinhaTarefa";
import { FiltroResponsavelTarefas } from "@/components/processos/FiltroResponsavelTarefas";
import { RecorrentesPainel, type RegraRecorrenteDTO } from "@/components/processos/RecorrentesPainel";
import { preverProxima } from "@/lib/tarefas-recorrentes";
import { usuarioTemPermissao, requireAuth } from "@/lib/perfil";
import { filtroSegregacao, filtroProcesso } from "@/lib/segregacao";

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  responsavel?: string | string[];
  aba?: string | string[];
}>;

export default async function TarefasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusParam = typeof sp.status === "string" ? sp.status : "nao_iniciado";
  const responsavelParam = typeof sp.responsavel === "string" ? Number(sp.responsavel) : 0;
  const responsavelFiltro = Number.isFinite(responsavelParam) && responsavelParam > 0 ? responsavelParam : null;
  const abaRecorrentes = typeof sp.aba === "string" && sp.aba === "recorrentes";
  const ABAS = [
    { value: "nao_iniciado", label: "Não Iniciadas" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "para_revisao", label: "Para Revisão" },
    { value: "concluida", label: "Concluídas" },
  ] as const;
  type StatusAba = (typeof ABAS)[number]["value"];
  const statusAtual: StatusAba = (ABAS as readonly { value: string }[]).some((a) => a.value === statusParam)
    ? (statusParam as StatusAba)
    : "nao_iniciado";
  const podeCriar = await usuarioTemPermissao("tarefa:criar");
  const podeExcluir = await usuarioTemPermissao("tarefa:excluir");
  const podeAnexar = await usuarioTemPermissao("tarefa:editar");
  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const podeEditarTudo = user.perfilNome === "Administrador" || user.perfilNome === "Técnico Chefe";
  const { scoped, responsavelPessoaId } = await filtroSegregacao();

  const statusFilter = { status: statusAtual };

  const escopoTarefa = scoped && responsavelPessoaId
    ? { OR: [{ processo: { responsavelPessoaId } }, { responsavelPessoaId }] }
    : {};

  const buscaTitulo = q ? { titulo: { contains: q, mode: "insensitive" as const } } : {};
  const filtroResponsavel = responsavelFiltro ? { responsavelPessoaId: responsavelFiltro } : {};

  const [tarefas, pessoas, empreendimentos, processosAmbientais, processosMassa, contagens, regrasBrutas] = await Promise.all([
    prisma.tarefa.findMany({
      where: { ativo: true, deletedAt: null, ...(isAdmin ? {} : { visibilidade: "publico" }), ...escopoTarefa, ...statusFilter, ...buscaTitulo, ...filtroResponsavel },
      orderBy: [{ status: "asc" }, { prazoData: "asc" }],
      include: {
        responsavel: true,
        processo: { include: { orgao: true } },
        empreendimento: true,
        _count: { select: { anexos: true } },
        recorrencia: { select: { intervaloDias: true, ativo: true } },
      },
      take: 200,
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({
      where: { ativo: true, deletedAt: null },
      orderBy: { nome: "asc" },
      include: {
        processos: { where: { ativo: true, deletedAt: null, ...filtroProcesso(scoped, responsavelPessoaId) }, select: { id: true, numero: true, natureza: true } },
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
    prisma.processo.findMany({
      where: { ativo: true, deletedAt: null },
      orderBy: { numero: "asc" },
      select: {
        id: true, numero: true, apelido: true, natureza: true, numeroLicenca: true,
        empreendimento: { select: { nome: true, apelido: true } },
        licencas: { select: { licenca: { select: { empreendimento: { select: { nome: true, apelido: true } } } } } },
      },
    }),
    prisma.tarefa.groupBy({
      by: ["status"],
      where: { ativo: true, deletedAt: null, ...(isAdmin ? {} : { visibilidade: "publico" }), ...escopoTarefa, ...buscaTitulo, ...filtroResponsavel },
      _count: true,
    }),
    abaRecorrentes
      ? prisma.tarefaRecorrente.findMany({
          where: {
            ...(isAdmin ? {} : { visibilidade: "publico" }),
            ...(scoped && responsavelPessoaId ? { responsavelPessoaId } : {}),
          },
          orderBy: { id: "desc" },
          include: {
            responsavel: { select: { nome: true } },
            empreendimento: { select: { nome: true, apelido: true } },
            processo: { select: { numero: true, orgao: { select: { sigla: true } } } },
            tarefas: {
              where: { ativo: true, deletedAt: null },
              orderBy: { id: "desc" },
              take: 1,
              select: { id: true, status: true, prazoData: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const contagemPorStatus = new Map(contagens.map((c) => [c.status, c._count]));

  const isoDia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  type RegraListada = {
    id: number;
    titulo: string;
    intervaloDias: number;
    ativo: boolean;
    prioridade: string;
    fimRecorrencia: Date | null;
    responsavel: { nome: string };
    empreendimento: { nome: string; apelido: string | null } | null;
    processo: { numero: string; orgao: { sigla: string } } | null;
    tarefas: { id: number; status: string; prazoData: Date | null }[];
  };
  const regrasDTO: RegraRecorrenteDTO[] = (regrasBrutas as unknown as RegraListada[]).map((r) => {
    const atual = r.tarefas[0] ?? null;
    const emp = r.empreendimento ? r.empreendimento.apelido || r.empreendimento.nome : null;
    const proc = r.processo ? `Processo #${r.processo.numero} (${r.processo.orgao.sigla})` : null;
    return {
      id: r.id,
      titulo: r.titulo,
      intervaloDias: r.intervaloDias,
      ativo: r.ativo,
      prioridade: r.prioridade,
      fimRecorrencia: isoDia(r.fimRecorrencia),
      responsavelNome: r.responsavel.nome,
      vinculo: [emp, proc].filter(Boolean).join(" · ") || null,
      proximaPrevista: r.ativo ? isoDia(preverProxima(r.intervaloDias, atual?.prazoData ?? null)) : null,
      ocorrencia: atual
        ? { id: atual.id, status: atual.status, prazoData: isoDia(atual.prazoData), dataConclusao: null }
        : null,
    };
  });

  const empreendimentosOpt = empreendimentos.map((e) => {
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
  });

  const exportParams = new URLSearchParams();
  exportParams.set("status", statusAtual);
  if (q) exportParams.set("q", q);
  if (responsavelFiltro) exportParams.set("responsavel", String(responsavelFiltro));
  const exportQuery = `?${exportParams.toString()}`;

  const paramsAba = (status: string) => {
    const p = new URLSearchParams();
    p.set("status", status);
    if (q) p.set("q", q);
    if (responsavelFiltro) p.set("responsavel", String(responsavelFiltro));
    return `?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Tarefas"
        subtitle="Tarefas e suas exigências vinculadas"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/tarefas/exportar${exportQuery}&formato=pdf`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar PDF</Button>
            </a>
            <a href={`/api/tarefas/exportar${exportQuery}&formato=xlsx`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar XLSX</Button>
            </a>
            {podeCriar && <ImportarTarefas />}
          </div>
        }
      />

      {podeCriar && (
        <>
          <NovaTarefaBotao
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
            empreendimentos={empreendimentosOpt}
            processosAmbientais={processosAmbientais}
            isAdmin={isAdmin}
          />
          <TarefaEmMassa
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
            processos={processosMassa.map((p) => {
              const emp = p.empreendimento ?? p.licencas.map((x) => x.licenca.empreendimento).find(Boolean);
              return {
                id: p.id,
                numero: p.numero,
                apelido: p.apelido,
                natureza: p.natureza,
                numeroLicenca: p.numeroLicenca,
                empreendimento: emp ? (emp.apelido || emp.nome) : "Sem empreendimento",
              };
            })}
            showVisibilidade={isAdmin}
          />
        </>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4">
          {ABAS.map((aba) => {
            const ativo = statusAtual === aba.value;
            const total = contagemPorStatus.get(aba.value) ?? 0;
            return (
              <Link
                key={aba.value}
                href={`/tarefas${paramsAba(aba.value)}`}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${ativo ? (aba.value === "concluida" ? "bg-emerald-50 text-emerald-800" : "bg-navy-100 text-navy-800") : "text-muted hover:bg-slate-100"}`}
              >
                {aba.label} ({total})
              </Link>
            );
          })}
          <Link
            href={`/tarefas?aba=recorrentes${q ? `&q=${encodeURIComponent(q)}` : ""}${responsavelFiltro ? `&responsavel=${responsavelFiltro}` : ""}`}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${abaRecorrentes ? "bg-navy-100 text-navy-800" : "text-muted hover:bg-slate-100"}`}
          >
            <RefreshCw className="h-3 w-3" /> Recorrentes
          </Link>
          <FiltroResponsavelTarefas pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))} valor={responsavelFiltro} />
          <form method="get" className="ml-auto flex items-center gap-2">
            <input type="hidden" name="status" value={statusAtual} />
            {responsavelFiltro ? <input type="hidden" name="responsavel" value={responsavelFiltro} /> : null}
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
        {abaRecorrentes ? (
          <RecorrentesPainel regras={regrasDTO} podeEditar={podeAnexar} podeExcluir={podeExcluir} />
        ) : (
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
                  dataConclusao: t.dataConclusao ? t.dataConclusao.toISOString() : null,
                  responsavelNome: t.responsavel.nome,
                  processoLabel: t.processo ? `Processo: #${t.processo.numero} (${t.processo.orgao.sigla})` : "Processo: — sem vínculo —",
                  empreendimentoId: t.empreendimentoId,
                  processoId: t.processoId,
                  anexosCount: t._count.anexos,
                  recorrenteDias: t.recorrencia?.intervaloDias ?? null,
                }}
                pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
                empreendimentos={empreendimentosOpt}
                processosAmbientais={processosAmbientais}
                isAdmin={isAdmin}
                podeEditarTudo={podeEditarTudo}
                podeExcluir={podeExcluir}
                podeAnexar={podeAnexar}
              />
            </li>
          ))}
          {tarefas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              {statusAtual === "concluida" ? "Nenhuma tarefa concluída." : `Nenhuma tarefa em "${ABAS.find((a) => a.value === statusAtual)?.label}".`}
            </li>
          )}
        </ul>
        )}
      </Card>
    </div>
  );
}
