import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, CardHeader } from "@/components/ui";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type BarItem = { label: string; value: number };

function BarChart({
  title,
  items,
  color,
}: {
  title: string;
  items: BarItem[];
  color: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-3 p-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-navy-900">{item.label}</span>
              <span className="font-medium text-muted">{item.value}</span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded bg-slate-100">
              <div
                className={`h-full rounded ${color}`}
                style={{ width: `${(item.value / max) * 100}%`, minWidth: item.value > 0 ? "4px" : "0" }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted">Sem dados.</p>
        )}
      </div>
    </Card>
  );
}

function BarChartMoney({
  title,
  items,
  color,
}: {
  title: string;
  items: BarItem[];
  color: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-3 p-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-navy-900">{item.label}</span>
              <span className="font-medium text-muted">{formatBRL(item.value)}</span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded bg-slate-100">
              <div
                className={`h-full rounded ${color}`}
                style={{ width: `${(item.value / max) * 100}%`, minWidth: item.value > 0 ? "4px" : "0" }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted">Sem dados.</p>
        )}
      </div>
    </Card>
  );
}

export default async function IndicadoresPage() {
  await requirePermissao("relatorio:ler");

  const hoje = new Date();

  const [
    totalProcessos,
    processosAtivos,
    processosConcluidos,
    exigenciasPendentes,
    tarefasAtrasadas,
    condicionantesPendentes,
    processosPorStatus,
    rawPorTipo,
    rawPorOrgao,
    custosPorTipo,
    rawCustosPorProcesso,
  ] = await Promise.all([
    prisma.processo.count({ where: { ativo: true, deletedAt: null } }),
    prisma.processo.count({ where: { ativo: true, deletedAt: null, status: "em_andamento" } }),
    prisma.processo.count({ where: { ativo: true, deletedAt: null, status: { in: ["concluido", "arquivado"] } } }),
    prisma.exigencia.count({ where: { ativo: true, deletedAt: null, status: "pendente" } }),
    prisma.tarefa.count({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluida", "cancelada"] },
        prazoData: { not: null, lt: hoje },
      },
    }),
    prisma.condicionante.count({
      where: {
        ativo: true,
        deletedAt: null,
        status: { in: ["pendente", "em_atendimento"] },
      },
    }),
    prisma.processo.groupBy({
      by: ["status"],
      where: { ativo: true, deletedAt: null },
      _count: { id: true },
    }),
    prisma.processo.groupBy({
      by: ["tipoProcessoId"],
      where: { ativo: true, deletedAt: null },
      _count: { id: true },
    }),
    prisma.processo.groupBy({
      by: ["orgaoId"],
      where: { ativo: true, deletedAt: null },
      _count: { id: true },
    }),
    prisma.custo.groupBy({
      by: ["tipo"],
      where: { ativo: true, deletedAt: null },
      _sum: { valor: true },
    }),
    prisma.custo.groupBy({
      by: ["processoId"],
      where: { ativo: true, deletedAt: null },
      _sum: { valor: true },
      orderBy: { _sum: { valor: "desc" } },
      take: 8,
    }),
  ]);

  const [tiposMap, orgaosMap, processosMap] = await Promise.all([
    prisma.tipoProcesso.findMany({ where: { ativo: true }, select: { id: true, nome: true } }),
    prisma.orgao.findMany({ where: { ativo: true }, select: { id: true, sigla: true } }),
    prisma.processo.findMany({
      where: { id: { in: rawCustosPorProcesso.map((g) => g.processoId) } },
      select: { id: true, numero: true },
    }),
  ]);

  const tipoLookup = new Map(tiposMap.map((t) => [t.id, t.nome]));
  const orgaoLookup = new Map(orgaosMap.map((o) => [o.id, o.sigla]));
  const procLookup = new Map(processosMap.map((p) => [p.id, p.numero]));

  const porStatus: BarItem[] = processosPorStatus.map((g) => ({
    label: g.status,
    value: g._count.id,
  }));

  const porTipo: BarItem[] = rawPorTipo.map((g) => ({
    label: tipoLookup.get(g.tipoProcessoId) ?? "—",
    value: g._count.id,
  }));

  const porOrgao: BarItem[] = rawPorOrgao.map((g) => ({
    label: orgaoLookup.get(g.orgaoId) ?? "—",
    value: g._count.id,
  }));

  const custoTipo: BarItem[] = custosPorTipo.map((g) => ({
    label: g.tipo,
    value: g._sum.valor?.toNumber() ?? 0,
  }));

  const custoProcesso: BarItem[] = rawCustosPorProcesso.map((g) => ({
    label: procLookup.get(g.processoId) ? `#${procLookup.get(g.processoId)}` : "—",
    value: g._sum.valor?.toNumber() ?? 0,
  }));

  const stats = [
    { label: "Total de Processos", value: totalProcessos },
    { label: "Processos Ativos", value: processosAtivos },
    { label: "Processos Concluídos", value: processosConcluidos },
    { label: "Exigências Pendentes", value: exigenciasPendentes },
    { label: "Tarefas Atrasadas", value: tarefasAtrasadas },
    { label: "Condicionantes Pendentes", value: condicionantesPendentes },
  ];

  return (
    <div>
      <PageHeader
        title="Indicadores"
        subtitle="Painel de métricas e indicadores operacionais"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-bold text-navy-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <BarChart title="Processos por Status" items={porStatus} color="bg-navy-900" />
        <BarChart title="Processos por Tipo" items={porTipo} color="bg-gold-500" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BarChart title="Processos por Órgão" items={porOrgao} color="bg-blue-600" />
        <BarChartMoney title="Custos por Tipo" items={custoTipo} color="bg-emerald-600" />
      </div>

      <div className="mt-6">
        <BarChartMoney title="Custos por Processo (Top 8)" items={custoProcesso} color="bg-amber-500" />
      </div>
    </div>
  );
}
