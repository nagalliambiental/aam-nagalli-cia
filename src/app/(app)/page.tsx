import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/perfil";
import { Card, Badge } from "@/components/ui";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import {
  FolderOpen, CalendarClock, CheckSquare, BellRing, Wallet,
  FilePlus2, ArrowRight, TrendingUp, FileSignature,
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

export default async function DashboardPage() {
  await requireAuth();

  const [
    processosAtivos,
    prazosAbertos,
    tarefasPendentes,
    alertasUrgentes,
    custosPendentes,
    contratosVigentes,
    processosPorStatus,
    proximosPrazos,
    tarefasRecentes,
    atividade,
  ] = await Promise.all([
    prisma.processo.count({ where: { ativo: true, deletedAt: null, status: { notIn: ["cancelado", "arquivado"] } } }),
    prisma.prazo.count({ where: { ativo: true, deletedAt: null, status: { notIn: ["concluido", "cancelado"] } } }),
    prisma.tarefa.count({ where: { ativo: true, deletedAt: null, status: { notIn: ["concluida"] } } }),
    prisma.notificacao.count({ where: { lida: false, tipo: { in: ["prazo_vencido", "prazo_vencendo", "alerta"] } } }),
    prisma.custo.aggregate({ _sum: { valor: true }, where: { ativo: true, deletedAt: null, status: { notIn: ["pago", "cancelado"] } } }),
    prisma.contrato.count({ where: { ativo: true, deletedAt: null } }),
    prisma.processo.groupBy({ by: ["status"], _count: true, where: { ativo: true, deletedAt: null } }),
    prisma.prazo.findMany({
      where: { ativo: true, deletedAt: null, status: { notIn: ["concluido", "cancelado"] } },
      orderBy: { dataCalculadaAtual: "asc" },
      take: 7,
      include: { processo: { include: { orgao: true } } },
    }),
    prisma.tarefa.findMany({
      where: { ativo: true, deletedAt: null, status: { notIn: ["concluida"] } },
      orderBy: [{ prioridade: "asc" }, { prazoData: "asc" }],
      take: 6,
      include: { processo: true },
    }),
    prisma.historico.findMany({
      orderBy: { criadoEm: "desc" },
      take: 8,
      include: { tipoEntidade: true, usuario: true },
    }),
  ]);

  const cards = [
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
      label: "Alertas urgentes",
      value: alertasUrgentes,
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

  const statusTotal = processosPorStatus.reduce((s, x) => s + x._count, 0);
  const statusBars = processosPorStatus
    .map((x) => ({
      status: PROCESSO_STATUS[x.status] ?? { label: x.status, tone: "gray" as const },
      count: x._count,
      pct: statusTotal ? Math.round((x._count / statusTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

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
            Ambiental &amp; Mineral
          </h1>
          <p className="mt-1 text-white/70">Visão geral das operações da gestora</p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
        {/* Próximos prazos */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              Próximos prazos
            </h2>
            <Link href="/prazos" className="flex items-center gap-1 text-xs text-navy-600 hover:underline">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {proximosPrazos.map((p) => {
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
            {proximosPrazos.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Nenhum prazo em aberto.
              </li>
            )}
          </ul>
        </Card>

        {/* Tarefas */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                <CheckSquare className="h-4 w-4" />
              </span>
              Tarefas abertas
            </h2>
            <Link href="/tarefas" className="flex items-center gap-1 text-xs text-navy-600 hover:underline">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {tarefasRecentes.map((t) => {
              const st = TAREFA_STATUS[t.status] ?? { label: t.status, tone: "gray" as const };
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{t.titulo}</p>
                    <p className="truncate text-xs text-muted">
                      {t.processo ? `Processo ${t.processo.numero}` : "Sem processo"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {t.prazoData && (
                      <p className="mt-0.5 text-xs text-muted">{formatDate(t.prazoData)}</p>
                    )}
                  </div>
                </li>
              );
            })}
            {tarefasRecentes.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Nenhuma tarefa em aberto.
              </li>
            )}
          </ul>
        </Card>

        {/* Atividade recente */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              Atividade recente
            </h2>
            <Link href="/auditoria" className="flex items-center gap-1 text-xs text-navy-600 hover:underline">
              Auditoria <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {atividade.map((h) => (
              <li key={h.id} className="px-5 py-3">
                <p className="text-sm text-navy-900">
                  <span className="font-medium">{h.usuario?.email?.split("@")[0] ?? "—"}</span>{" "}
                  <span className="text-muted">
                    {h.acao} {h.tipoEntidade.nome}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {h.campo ? `campo: ${h.campo}` : ""}· {formatDate(h.criadoEm)}
                </p>
              </li>
            ))}
            {atividade.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Sem atividade registrada ainda.
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* Processos por status */}
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <FilePlus2 className="h-4 w-4" />
            </span>
            Processos por status
          </h2>
          <Link href="/indicadores" className="flex items-center gap-1 text-xs text-navy-600 hover:underline">
            Indicadores <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-3 p-5">
          {statusBars.map((s) => (
            <div key={s.status.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <Badge tone={s.status.tone}>{s.status.label}</Badge>
                <span className="text-muted">
                  {s.count} ({s.pct}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    s.status.tone === "green"
                      ? "bg-green-500"
                      : s.status.tone === "red"
                      ? "bg-red-500"
                      : s.status.tone === "blue"
                      ? "bg-navy-600"
                      : "bg-slate-400"
                  }`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}
          {statusBars.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">Nenhum processo cadastrado.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
