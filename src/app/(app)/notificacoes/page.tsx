import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/perfil";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { MarcarTodasLidas } from "@/components/notificacoes/MarcarTodasLidas";
import { CriarTarefaNotificacao } from "@/components/notificacoes/CriarTarefaNotificacao";

const TIPO: Record<string, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  dou_notificacao: { label: "DOU", tone: "blue" },
  sei_movimentacao: { label: "SEI", tone: "amber" },
  sei_protocolo: { label: "SEI · Protocolo", tone: "blue" },
  prazo_vencido: { label: "Prazo vencido", tone: "red" },
  prazo_vencendo: { label: "Prazo vencendo", tone: "amber" },
  alerta: { label: "Alerta", tone: "red" },
};

export default async function NotificacoesPage() {
  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const [notifs, pessoas] = await Promise.all([
    prisma.notificacao.findMany({
      orderBy: { criadoEm: "desc" },
      take: 200,
      include: { processo: { select: { id: true, numero: true } } },
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Central de Avisos"
        subtitle="Histórico de avisos (DOU, SEI, prazos e alertas) — crie tarefas direto daqui"
        actions={<MarcarTodasLidas />}
      />
      <Card>
        <ul className="divide-y divide-slate-100">
          {notifs.map((n) => {
            const t = TIPO[n.tipo] ?? { label: n.tipo, tone: "gray" as const };
            return (
              <li key={n.id} className={`px-5 py-3 ${n.lida ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-navy-900">
                      <Badge tone={t.tone}>{t.label}</Badge>
                      <span className="truncate">{n.mensagem}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>{formatDate(n.criadoEm)}</span>
                      {n.termo && <span>Termo: {n.termo}</span>}
                      {n.processo && (
                        <Link href={`/processos/${n.processo.id}`} className="text-navy-600 hover:underline">
                          Processo {n.processo.numero}
                        </Link>
                      )}
                      {n.url && (
                        <a href={n.url} target="_blank" rel="noreferrer" className="text-navy-600 underline hover:text-navy-800">
                          Ver publicação ↗
                        </a>
                      )}
                      {n.lida && <span>· lida</span>}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <CriarTarefaNotificacao
                      notificacaoId={n.id}
                      mensagem={n.mensagem}
                      processoId={n.processo?.id ?? null}
                      processoNumero={n.processo?.numero ?? null}
                      pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>
              </li>
            );
          })}
          {notifs.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">Nenhuma notificação.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
