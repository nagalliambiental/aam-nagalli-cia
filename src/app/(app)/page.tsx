import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/perfil";
import { Card, Badge } from "@/components/ui";
import { formatDate, formatRelative } from "@/lib/format";
import {
  CalendarClock, CheckSquare, Newspaper, Radio, ArrowRight, TrendingUp,
} from "lucide-react";

const TAREFA_STATUS: Record<string, { label: string; tone: "blue" | "green" | "amber" | "gray" | "gold" }> = {
  nao_iniciado: { label: "Não Iniciado", tone: "gray" },
  em_andamento: { label: "Em andamento", tone: "blue" },
  concluida: { label: "Concluído", tone: "green" },
  para_revisao: { label: "Para Revisão", tone: "gold" },
  pendente: { label: "Não Iniciado", tone: "gray" },
};

const AGORA = new Date();
const EM_60_DIAS = new Date(AGORA.getTime() + 60 * 86400000);

export default async function DashboardPage() {
  await requireAuth();
  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const segTarefa = user.perfilNome === "Técnico" && user.pessoaId ? { responsavelPessoaId: user.pessoaId } : {};

  const [prazosProximos, tarefasAbertas, douAvisos, seiAvisos] = await Promise.all([
    prisma.prazo.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluido", "cancelado"] },
        dataCalculadaAtual: { not: null, lte: EM_60_DIAS },
        processo: { ativo: true, deletedAt: null },
      },
      orderBy: { dataCalculadaAtual: "asc" },
      take: 12,
      select: {
        id: true, descricao: true, status: true, dataCalculadaAtual: true, alertaDias: true,
        processoId: true,
        processo: { select: { numero: true, orgao: { select: { sigla: true } } } },
      },
    }),
    prisma.tarefa.findMany({
      where: {
        ativo: true,
        deletedAt: null,
        status: { notIn: ["concluida"] },
        ...segTarefa,
        ...(isAdmin ? {} : { visibilidade: "publico" }),
      },
      orderBy: [{ prazoData: "asc" }],
      take: 200,
      select: {
        id: true, titulo: true, status: true, prazoData: true,
        responsavel: { select: { id: true, nome: true } },
      },
    }),
    prisma.notificacao.findMany({
      where: { tipo: "dou_notificacao" },
      orderBy: { criadoEm: "desc" },
      take: 10,
      select: { id: true, mensagem: true, criadoEm: true, lida: true },
    }),
    prisma.notificacao.findMany({
      where: { tipo: { in: ["sei_movimentacao", "sei_protocolo"] } },
      orderBy: { criadoEm: "desc" },
      take: 10,
      select: { id: true, mensagem: true, criadoEm: true, lida: true, processo: { select: { id: true, numero: true } } },
    }),
  ]);

  // Tarefas agrupadas por pessoa com contagem por status
  const porPessoa = new Map<number, { nome: string; total: number; porStatus: Record<string, number> }>();
  for (const t of tarefasAbertas) {
    const entrada = porPessoa.get(t.responsavel.id) ?? { nome: t.responsavel.nome, total: 0, porStatus: {} };
    entrada.total += 1;
    entrada.porStatus[t.status] = (entrada.porStatus[t.status] ?? 0) + 1;
    porPessoa.set(t.responsavel.id, entrada);
  }
  const tarefasPorPessoa = [...porPessoa.values()].sort((a, b) => b.total - a.total);
  const douNaoLidas = douAvisos.filter((a) => !a.lida).length;
  const seiNaoLidas = seiAvisos.filter((a) => !a.lida).length;

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
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">O que precisa da sua atenção?</h1>
          <p className="mt-1 text-white/70">
            {prazosProximos.length + douNaoLidas + seiNaoLidas > 0
              ? `${prazosProximos.length} prazo(s) perto do vencimento, ${douNaoLidas} aviso(s) DOU e ${seiNaoLidas} movimentação(ões) SEI não lida(s).`
              : "Tudo em dia: nenhum prazo próximo ou aviso pendente."}
          </p>
        </div>
      </div>

      {/* 4 cards — 25% cada */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Prazos perto do vencimento */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              Prazos perto do venc.
            </h2>
            <Badge tone="amber">{prazosProximos.length}</Badge>
          </div>
          <ul className="divide-y divide-slate-100">
            {prazosProximos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <Link href={`/processos/${p.processoId}`} className="min-w-0">
                  <p className="truncate text-xs font-medium text-navy-900">{p.descricao}</p>
                  <p className="truncate text-[10px] text-muted">{p.processo ? `#${p.processo.numero} · ${p.processo.orgao.sigla}` : "Sem processo"}</p>
                </Link>
                <div className="shrink-0 text-right">
                  <Badge tone={formatRelative(p.dataCalculadaAtual).tone}>{formatRelative(p.dataCalculadaAtual).label}</Badge>
                  <p className="mt-0.5 text-[10px] text-muted">{formatDate(p.dataCalculadaAtual)}</p>
                </div>
              </li>
            ))}
            {prazosProximos.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhum prazo próximo.</li>}
          </ul>
        </Card>

        {/* Tarefas por pessoa */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                <CheckSquare className="h-4 w-4" />
              </span>
              Tarefas por pessoa
            </h2>
            <Link href="/tarefas" className="text-[10px] text-navy-600 hover:underline">Ver todas</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {tarefasPorPessoa.slice(0, 8).map((p) => (
              <li key={p.nome} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <p className="min-w-0 truncate text-xs font-medium text-navy-900">{p.nome}</p>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {Object.entries(p.porStatus).map(([status, qtd]) => (
                    <Badge key={status} tone={TAREFA_STATUS[status]?.tone ?? "gray"}>
                      {qtd} {TAREFA_STATUS[status]?.label ?? status}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
            {tarefasPorPessoa.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhuma tarefa em aberto.</li>}
          </ul>
        </Card>

        {/* DOU Notificações */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Newspaper className="h-4 w-4" />
              </span>
              DOU
            </h2>
            {douNaoLidas > 0 && <Badge tone="red">{douNaoLidas} novo(s)</Badge>}
          </div>
          <ul className="divide-y divide-slate-100">
            {douAvisos.map((a) => (
              <li key={a.id} className={`px-4 py-2.5 ${a.lida ? "opacity-60" : ""}`}>
                <p className="truncate text-xs font-medium text-navy-900" title={a.mensagem}>{a.mensagem}</p>
                <p className="mt-0.5 text-[10px] text-muted">{formatDate(a.criadoEm)}</p>
              </li>
            ))}
            {douAvisos.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhuma notificação.</li>}
          </ul>
          <Link href="/ferramentas/dou" className="border-t border-slate-100 px-4 py-2 text-center text-[10px] text-navy-600 hover:underline">
            Ver módulo DOU <ArrowRight className="inline h-3 w-3" />
          </Link>
        </Card>

        {/* Movimentações SEI */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <Radio className="h-4 w-4" />
              </span>
              SEI
            </h2>
            {seiNaoLidas > 0 && <Badge tone="red">{seiNaoLidas} novo(s)</Badge>}
          </div>
          <ul className="divide-y divide-slate-100">
            {seiAvisos.map((a) => (
              <li key={a.id} className={`px-4 py-2.5 ${a.lida ? "opacity-60" : ""}`}>
                <p className="truncate text-xs font-medium text-navy-900" title={a.mensagem}>{a.mensagem}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {a.processo ? `Processo ${a.processo.numero} · ` : ""}
                  {formatDate(a.criadoEm)}
                </p>
              </li>
            ))}
            {seiAvisos.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhuma movimentação.</li>}
          </ul>
          <Link href="/ferramentas/sei" className="border-t border-slate-100 px-4 py-2 text-center text-[10px] text-navy-600 hover:underline">
            Ver movimentações SEI <ArrowRight className="inline h-3 w-3" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
