import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, Button, EmptyState } from "@/components/ui";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

type CalEvent = {
  data: Date;
  tipo: "Prazo" | "Tarefa" | "Condicionante";
  titulo: string;
  referencia: string;
  href: string;
  prioridade: string;
};

function parseMonthParam(mes?: string): { year: number; month: number } {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requirePermissao("processo:ler");

  const params = await searchParams;
  const { year, month } = parseMonthParam(params.mes);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);

  const prevMes = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMes = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const currentMes = `${year}-${String(month + 1).padStart(2, "0")}`;

  const [prazos, tarefas, condicionantes] = await Promise.all([
    prisma.prazo.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluido", "cancelado"] },
        dataCalculadaAtual: { not: null, gte: monthStart, lte: monthEnd },
      },
      include: {
        processo: { include: { orgao: true } },
      },
    }),
    prisma.tarefa.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluida", "cancelada"] },
        prazoData: { not: null, gte: monthStart, lte: monthEnd },
      },
      include: {
        processo: true,
        responsavel: true,
      },
    }),
    prisma.condicionante.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { in: ["pendente", "em_atendimento"] },
        proximoVencimento: { not: null, gte: monthStart, lte: monthEnd },
      },
      include: {
        licenca: { include: { orgao: true } },
      },
    }),
  ]);

  const events: CalEvent[] = [
    ...prazos.map((p) => ({
      data: new Date(p.dataCalculadaAtual!),
      tipo: "Prazo" as const,
      titulo: p.descricao,
      referencia: p.processo ? `Processo #${p.processo.numero} · ${p.processo.orgao.sigla}` : "",
      href: `/prazos`,
      prioridade: p.status,
    })),
    ...tarefas.map((t) => ({
      data: new Date(t.prazoData!),
      tipo: "Tarefa" as const,
      titulo: t.titulo,
      referencia: t.processo ? `Processo #${t.processo.numero}` : "",
      href: `/tarefas`,
      prioridade: t.prioridade,
    })),
    ...condicionantes.map((c) => ({
      data: new Date(c.proximoVencimento!),
      tipo: "Condicionante" as const,
      titulo: c.descricao,
      referencia: `Licença ${c.licenca.numero} · ${c.licenca.orgao.sigla}`,
      href: `/condicionantes`,
      prioridade: c.status,
    })),
  ];

  events.sort((a, b) => a.data.getTime() - b.data.getTime());

  const byDay = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = toKey(ev.data);
    const list = byDay.get(key) || [];
    list.push(ev);
    byDay.set(key, list);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayHeaders: { key: string; label: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const key = toKey(dt);
    if (byDay.has(key)) {
      const weekday = WEEKDAYS[dt.getDay()];
      dayHeaders.push({
        key,
        label: `${String(d).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year} · ${weekday}`,
      });
    }
  }

  const badgeByType: Record<string, string> = {
    Prazo: "blue",
    Tarefa: "amber",
    Condicionante: "green",
  };

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle={`${MONTHS[month]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/calendario?mes=${prevMes}`}>
              <Button variant="secondary">← Mês anterior</Button>
            </Link>
            <Link href={`/calendario?mes=${currentMes}`}>
              <Button variant="ghost">Hoje</Button>
            </Link>
            <Link href={`/calendario?mes=${nextMes}`}>
              <Button variant="secondary">Próximo mês →</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> Prazo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Tarefa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Condicionante
        </span>
      </div>

      {dayHeaders.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum evento neste mês" description="Tente navegar para outro período." />
        </Card>
      ) : (
        <Card>
          {dayHeaders.map((dh, idx) => (
            <div key={dh.key}>
              {idx > 0 && <div className="border-t border-slate-100" />}
              <div className="px-5 pt-4 pb-1">
                <h3 className="text-sm font-semibold text-navy-900">{dh.label}</h3>
              </div>
              <ul className="divide-y divide-slate-50">
                {byDay.get(dh.key)!.map((ev, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${ev.tipo === "Prazo" ? "bg-blue-500" : ev.tipo === "Tarefa" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div>
                        <p className="text-sm font-medium text-navy-900">{ev.titulo}</p>
                        {ev.referencia && <p className="text-xs text-muted">{ev.referencia}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={badgeByType[ev.tipo] as "blue" | "amber" | "green"}>{ev.tipo}</Badge>
                      <Link href={ev.href} className="text-xs text-navy-700 hover:underline">
                        Ver
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
