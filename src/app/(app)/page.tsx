import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/perfil";
import { Card, Badge } from "@/components/ui";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import {
  FolderOpen, CalendarClock, CheckSquare, BellRing, Wallet,
  FilePlus2, ArrowRight, TrendingUp, FileSignature, AlertTriangle,
} from "lucide-react";

const PROCESSO_STATUS: Record<string, { label: string; tone: "blue" | "green" | "gray" | "red" }> = {
  em_andamento: { label: "Em andamento", tone: "blue" },
  concluido: { label: "Concluído", tone: "green" },
  arquivado: { label: "Arquivado", tone: "gray" },
  cancelado: { label: "Cancelado", tone: "red" },
  encerrado: { label: "Encerrado", tone: "gray" },
};

const TAREFA_STATUS: Record<string, { label: string; tone: "blue" | "green" | "amber" }> = {
  pendente: { label: "Pendente", tone: "amber" },
  em_andamento: { label: "Em andamento", tone: "blue" },
  concluida: { label: "Concluída", tone: "green" },
};

const AGORA = new Date();

export default async function DashboardPage() {
  await requireAuth();

  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const segProcesso = user.perfilNome === "Técnico" && user.pessoaId ? { responsavelPessoaId: user.pessoaId } : {};
  const segTarefa = user.perfilNome === "Técnico" && user.pessoaId ? { responsavelPessoaId: user.pessoaId } : {};

  const [
    alertasNaoLidas,
    alertas,
    prazosAtencao,
    tarefasAtencao,
    processosAtivos,
    prazosAbertos,
    tarefasPendentes,
    custosPendentes,
    contratosVigentes,
  ] = await Promise.all([
    prisma.notificacao.count({ where: { lida: false, tipo: { in: ["prazo_vencido", "prazo_vencendo", "alerta", "sei_movimentacao", "dou_notificacao"] } } }),
    prisma.notificacao.findMany({
      where: { lida: false, tipo: { in: ["prazo_vencido", "prazo_vencendo", "alerta", "sei_movimentacao", "dou_notificacao"] } },
      orderBy: { criadoEm: "desc" },
      take: 8,
      include: { processo: { include: { orgao: true } } },
    }),
    prisma.prazo.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluido", "cancelado"] },
        processo: { ativo: true, deletedAt: null, ...segProcesso },
      },
      orderBy: { dataCalculadaAtual: "asc" },
      take: 200,
      include: { processo: { include: { orgao: true } } },
    }),
    prisma.tarefa.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluida"] },
        ...segTarefa,
        OR: [
          { prazoData: { lte: new Date(AGORA.getTime() + 60 * 24 * 60 * 60 * 1000) } },
          { prazoData: null },
        ],
      },
      orderBy: [{ prioridade: "asc" }, { prazoData: "asc" }],
      take: 12,
      include: { processo: true, responsavel: true, empreendimento: true },
    }),
    prisma.processo.count({ where: { ativo: true, deletedAt: null, status: { notIn: ["cancelado", "arquivado"] }, ...segProcesso } }),
    prisma.prazo.count({ where: { ativo: true, deletedAt: null, status: { notIn: ["concluido", "cancelado"] }, processo: { ativo: true, deletedAt: null, ...segProcesso } } }),
    prisma.tarefa.count({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluida"] },
        ...segTarefa,
      },
    }),
    prisma.custo.aggregate({ _sum: { valor: true }, where: { ativo: true, deletedAt: null, status: { notIn: ["pago", "cancelado"] } } }),
    prisma.contrato.count({ where: { ativo: true, deletedAt: null } }),
  ]);

  const allCards = [
    {
      label: "Processos ativos",
      value: processosAtivos,
      icon: FolderOpen,
      href: "/processos",
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Prazos abertos",
      value: prazosAbertos,
      icon: CalendarClock,
      href: "/prazos",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      label: "Tarefas abertas",
      value: tarefasPendentes,
      icon: CheckSquare,
      href: "/tarefas",
      iconBg: "bg-violet-50 text-violet-600",
    },
    {
      label: "Alertas",
      value: alertasNaoLidas,
      icon: BellRing,
      href: "/alertas",
      iconBg: "bg-red-50 text-red-600",
    },
    {
      label: "Custos pendentes",
      value: formatMoney(custosPendentes._sum.valor),
      icon: Wallet,
      href: "/financeiro",
      money: true,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Contratos",
      value: contratosVigentes,
      icon: FileSignature,
      href: "/contratos",
      iconBg: "bg-navy-50 text-navy-700",
    },
  ];
  const cards = isAdmin ? allCards : allCards.filter((c) => c.label !== "Custos pendentes" && c.label !== "Contratos");

  // Prazo entra em atenção quando está a ≤ seu alertaDias do vencimento (ou já vencido).
  const dentroAlerta = (p: (typeof prazosAtencao)[number]) => {
    if (!p.dataCalculadaAtual) return false;
    const dias = p.alertaDias ?? 30;
    const alvo = p.dataCalculadaAtual.getTime() - dias * 24 * 60 * 60 * 1000;
    return alvo <= AGORA.getTime();
  };
  const prazosAlertas = prazosAtencao.filter(dentroAlerta).slice(0, 10);
  const totalAtencao = prazosAlertas.length + tarefasAtencao.length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 text-white shadow-sm md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-gold-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-navy-500/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500 text-navy-900">
              <TrendingUp className="h-4 w-4" />
            </span>
            Painel de gestão
          </div>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">
            O que precisa da sua atenção?
          </h1>
          <p className="mt-1 text-white/70">
            {isAdmin
              ? totalAtencao > 0
                  ? `${prazosAlertas.length} ${prazosAlertas.length === 1 ? "prazo" : "prazos"} perto do vencimento e ${tarefasAtencao.length} ${tarefasAtencao.length === 1 ? "tarefa" : "tarefas"} da equipe.`
                : `Tudo em dia: ${processosAtivos} ${processosAtivos === 1 ? "processo ativo" : "processos ativos"} acompanhando.`
              : totalAtencao > 0
                  ? `${prazosAlertas.length} ${prazosAlertas.length === 1 ? "prazo" : "prazos"} perto do vencimento e ${tarefasAtencao.length} ${tarefasAtencao.length === 1 ? "tarefa" : "tarefas"} suas.`
                : `Tudo em dia: ${tarefasAtencao.length === 0 ? "nenhuma tarefa pendente" : `${processosAtivos} processos acompanhando.`}`}
          </p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className={`grid grid-cols-2 gap-4 ${cards.length === 6 ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-4"}`}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href}>
              <Card className="group h-full p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.iconBg}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-navy-600" />
                </div>
                <p
                  className={`mt-3 truncate font-bold text-navy-900 ${
                    c.money ? "text-xl" : "text-2xl"
                  }`}
                >
                  {c.value}
                </p>
                <p className="mt-0.5 text-xs font-medium text-muted">{c.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Prazos perto do vencimento (definido pelo alerta de cada um) */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              Prazos perto do vencimento
            </h2>
            <Link href="/operacoes" className="flex items-center gap-1 text-xs text-navy-600 hover:underline">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {prazosAlertas.map((p) => {
              const rel = formatRelative(p.dataCalculadaAtual);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/processos/${p.processoId}`} className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{p.descricao}</p>
                    <p className="truncate text-xs text-muted">
                      {p.processo.numero} · {p.processo.orgao?.sigla ?? p.processo.orgao?.nome}
                    </p>
                  </Link>
                  <div className="shrink-0 text-right">
                    <Badge tone={rel.tone}>{rel.label}</Badge>
                    <p className="mt-0.5 text-xs text-muted">{formatDate(p.dataCalculadaAtual)}</p>
                  </div>
                </li>
              );
            })}
            {prazosAlertas.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Nenhum prazo próximo do vencimento.
              </li>
            )}
          </ul>
        </Card>

        {/* Tarefas que precisam de atenção */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                <CheckSquare className="h-4 w-4" />
              </span>
              Tarefas em aberto
            </h2>
            <Link href="/tarefas" className="flex items-center gap-1 text-xs text-navy-600 hover:underline">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {tarefasAtencao.map((t) => {
              const st = TAREFA_STATUS[t.status] ?? { label: t.status, tone: "gray" as const };
              const prazoRel = t.prazoData ? formatRelative(t.prazoData) : null;
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/tarefas/${t.id}`} className="block truncate text-sm font-medium text-navy-900 hover:underline">{t.titulo}</Link>
                    <p className="truncate text-xs text-muted">
                      {t.empreendimento?.nome ? `${t.empreendimento.nome} · ` : ""}
                      {t.processo ? `Processo ${t.processo.numero}` : "Sem processo"}
                      {t.responsavel?.nome ? ` · ${t.responsavel.nome}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {prazoRel && (
                      <p className="mt-0.5">
                        <Badge tone={prazoRel.tone}>{prazoRel.label}</Badge>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
            {tarefasAtencao.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Nenhuma tarefa em aberto.
              </li>
            )}
          </ul>
        </Card>

        {/* Alertas - configurável até 30 dias */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-600">
                <BellRing className="h-4 w-4" />
              </span>
              Alertas urgentes (30 dias)
            </h2>
            <Link href="/alertas" className="flex items-center gap-1 text-xs text-navy-600 hover:underline">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {alertas.length === 0 && (
              <li className="flex items-center gap-2 px-5 py-8 text-sm text-muted">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Tudo em dia. Nenhum alerta urgente no momento.
              </li>
            )}
            {alertas.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900">{a.mensagem}</p>
                    {a.processo && (
                      <Link
                        href={`/processos/${a.processo.id}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-navy-600 hover:underline"
                      >
                        {a.processo.numero} <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

    </div>
  );
}
