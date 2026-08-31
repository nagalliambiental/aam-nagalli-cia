import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, Badge } from "@/components/ui";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import {
  FolderOpen, CalendarClock, CheckSquare, BellRing, Wallet, UserPlus,
  FilePlus2, ArrowRight, TrendingUp,
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
  await requirePermissao("dashboard:ver");

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
    },
    {
      label: "Prazos abertos",
      value: prazosAbertos,
      icon: CalendarClock,
      href: "/prazos",
    },
    {
      label: "Tarefas abertas",
      value: tarefasPendentes,
      icon: CheckSquare,
      href: "/tarefas",
    },
    {
      label: "Alertas urgentes",
      value: alertasUrgentes,
      icon: BellRing,
      href: "/alertas",
    },
    {
      label: "Custos pendentes",
      value: formatMoney(custosPendentes._sum.valor),
      icon: Wallet,
      href: "/financeiro",
      money: true,
    },
    {
      label: "Contratos",
      value: contratosVigentes,
      icon: UserPlus,
      href: "/contratos",
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
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-navy-900">Painel de gestão</h1>
        <p className="mt-1 text-sm text-muted">
          Ambiental &amp; Mineral · visão geral do sistema
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href}>
              <Card className="group p-4 transition hover:shadow-md">
                <div className="flex items-center gap-2 text-muted">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
                </div>
                <p
                  className={`mt-3 truncate font-bold text-navy-900 ${
                    c.money ? "text-lg" : "text-3xl"
                  }`}
                >
                  {c.value}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Próximos prazos */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-navy-900">Próximos prazos</h2>
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
            <h2 className="text-sm font-semibold text-navy-900">Tarefas abertas</h2>
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
              <TrendingUp className="h-4 w-4" /> Atividade recente
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
            <FilePlus2 className="h-4 w-4" /> Processos por status
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
