import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, CardHeader, Badge, EmptyState, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

type AlertItem = {
  titulo: string;
  referencia: string;
  data: Date;
  href: string;
  tipo: string;
};

function toSaoPauloDate(d: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const dd = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${dd}T00:00:00`);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBefore(a: Date, b: Date): boolean {
  const ta = a.getTime();
  const tb = b.getTime();
  return ta < tb;
}

function isBetweenInclusive(d: Date, from: Date, to: Date): boolean {
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function SortAlerts(items: AlertItem[]): AlertItem[] {
  return [...items].sort((a, b) => a.data.getTime() - b.data.getTime());
}

function AlertList({ items }: { items: AlertItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="Nenhum item" />;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item, i) => (
        <li key={i} className="px-5 py-3">
          <Link
            href={item.href}
            className="flex items-center justify-between gap-4 transition hover:bg-slate-50 -mx-5 px-5 -my-3 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge tone="gray">{item.tipo}</Badge>
                <p className="truncate font-medium text-navy-900">{item.titulo}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted truncate">{item.referencia}</p>
            </div>
            <span className="whitespace-nowrap text-xs text-muted">até {formatDate(item.data)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  color,
  items,
}: {
  title: string;
  color: "red" | "amber" | "blue" | "gray";
  items: AlertItem[];
}) {
  const colorMap: Record<string, string> = {
    red: "border-l-red-500",
    amber: "border-l-amber-500",
    blue: "border-l-blue-500",
    gray: "border-l-slate-300",
  };
  return (
    <Card className={`border-l-4 ${colorMap[color]}`}>
      <CardHeader
        title={title}
        actions={
          <Badge tone={color === "red" ? "red" : color === "amber" ? "amber" : "blue"}>
            {items.length}
          </Badge>
        }
      />
      <AlertList items={items} />
    </Card>
  );
}

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function AlertasPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("processo:ler");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const now = new Date();
  const todaySaoPaulo = toSaoPauloDate(now);
  const tomorrow = addDays(todaySaoPaulo, 1);
  const in7 = addDays(todaySaoPaulo, 7);
  const in30 = addDays(todaySaoPaulo, 30);

  const [prazos, tarefas, condicionantes, exigencias] = await Promise.all([
    prisma.prazo.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluido", "cancelado"] },
        processo: { ativo: true, deletedAt: null },
        dataCalculadaAtual: { not: null },
      },
      include: { processo: { include: { orgao: true } } },
    }),
    prisma.tarefa.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluida", "cancelada"] },
        prazoData: { not: null },
      },
      include: { processo: { include: { orgao: true } } },
    }),
    prisma.condicionante.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { in: ["pendente", "em_atendimento"] },
        proximoVencimento: { not: null },
      },
      include: { licenca: true },
    }),
    prisma.exigencia.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluida"] },
        prazoResposta: { not: null },
      },
      include: { processo: { include: { orgao: true } } },
    }),
  ]);

  const prazoAlerts: AlertItem[] = prazos.map((p) => ({
    titulo: p.descricao,
    referencia: p.processo ? `Processo #${p.processo.numero} · ${p.processo.orgao.sigla}` : "Sem processo",
    data: toSaoPauloDate(p.dataCalculadaAtual!),
    href: `/processos/${p.processoId}`,
    tipo: "Prazo",
  }));

  const tarefaAlerts: AlertItem[] = tarefas.map((t) => ({
    titulo: t.titulo,
    referencia: t.processo ? `Processo #${t.processo.numero} · ${t.processo.orgao.sigla}` : "Sem processo",
    data: toSaoPauloDate(t.prazoData!),
    href: t.processo ? `/processos/${t.processoId}` : "#",
    tipo: "Tarefa",
  }));

  const condicionanteAlerts: AlertItem[] = condicionantes.map((c) => ({
    titulo: c.descricao,
    referencia: c.licenca ? `Licença #${c.licenca.numero}` : "Sem licença",
    data: toSaoPauloDate(c.proximoVencimento!),
    href: `/licencas/${c.licencaId}`,
    tipo: "Condicionante",
  }));

  const exigenciaAlerts: AlertItem[] = exigencias.map((e) => ({
    titulo: e.descricao,
    referencia: e.processo ? `Processo #${e.processo.numero} · ${e.processo.orgao.sigla}` : "Sem processo",
    data: toSaoPauloDate(e.prazoResposta!),
    href: `/processos/${e.processoId}`,
    tipo: "Exigência",
  }));

  const allRaw: AlertItem[] = [...prazoAlerts, ...tarefaAlerts, ...condicionanteAlerts, ...exigenciaAlerts];
  const all = q
    ? allRaw.filter((a) => a.titulo.toLowerCase().includes(q) || a.referencia.toLowerCase().includes(q) || a.tipo.toLowerCase().includes(q))
    : allRaw;

  const vencidos = SortAlerts(all.filter((a) => isBefore(a.data, todaySaoPaulo)));
  const vencendoHoje = SortAlerts(all.filter((a) => sameDay(a.data, todaySaoPaulo)));
  const proximos7 = SortAlerts(
    all.filter((a) => isBetweenInclusive(a.data, tomorrow, in7))
  );
  const proximos30 = SortAlerts(
    all.filter((a) => isBetweenInclusive(a.data, addDays(in7, 1), in30))
  );

  return (
    <div>
      <PageHeader
        title="Central de Alertas"
        subtitle="Prazos, tarefas, exigências e condicionantes com prazo"
      />

      <form method="get" className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por título, referência ou tipo..."
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>

      <div className="space-y-6">
        <Section title="Vencidos" color="red" items={vencidos} />
        <Section title="Vencendo hoje" color="amber" items={vencendoHoje} />
        <Section title="Próximos 7 dias" color="blue" items={proximos7} />
        <Section title="Próximos 30 dias" color="gray" items={proximos30} />
      </div>
    </div>
  );
}
