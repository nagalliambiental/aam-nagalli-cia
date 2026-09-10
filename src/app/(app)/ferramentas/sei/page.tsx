import { requirePermissao, requireAuth } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge } from "@/components/ui";
import { safeExternalUrl } from "@/lib/urls";
import { SeiAtualizarTodos } from "@/components/ferramentas/SeiAtualizarTodos";
import { CriarTarefaNotificacao } from "@/components/notificacoes/CriarTarefaNotificacao";

export default async function SeiPage() {
  await requirePermissao("processo:ler");
  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const [processos, movimentacoes, pessoas] = await Promise.all([
    prisma.processo.findMany({
      where: { ativo: true, deletedAt: null, natureza: "minerario", seiUrl: { not: null } },
      orderBy: { numero: "asc" },
      include: {
        seiProtocolos: { orderBy: { data: "desc" } },
        notificacoes: { where: { tipo: { in: ["sei_movimentacao", "sei_protocolo"] }, lida: false }, select: { id: true } },
      },
    }),
    prisma.notificacao.findMany({
      where: { tipo: { in: ["sei_movimentacao", "sei_protocolo"] }, lida: false },
      orderBy: { criadoEm: "desc" },
      take: 20,
      include: { processo: { select: { id: true, numero: true } } },
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Movimentações SEI"
        subtitle="Consulta consolidada dos processos ANM com URL pública cadastrada"
        actions={<SeiAtualizarTodos />}
      />

      <Card className="mb-6">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-navy-900">Novas movimentações</h2>
          {movimentacoes.length > 0 && <Badge tone="red">{movimentacoes.length} nova(s)</Badge>}
        </div>
        <ul className="divide-y divide-slate-100">
          {movimentacoes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy-900" title={n.mensagem}>{n.mensagem}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {n.processo ? `Processo ${n.processo.numero} · ` : ""}
                  {formatDate(n.criadoEm)}
                </p>
              </div>
              <div className="shrink-0">
                <CriarTarefaNotificacao
                  notificacaoId={n.id}
                  mensagem={n.mensagem}
                  processoId={n.processo?.id ?? null}
                  processoNumero={n.processo?.numero ?? null}
                  pessoas={pessoas}
                  isAdmin={isAdmin}
                />
              </div>
            </li>
          ))}
          {movimentacoes.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted">Nenhuma movimentação nova.</li>
          )}
        </ul>
      </Card>

      <div className="space-y-3">
        {processos.map((processo) => (
          <Card key={processo.id}>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                <span className="font-medium text-navy-900">Processo {processo.numero}</span>
                <span className="flex items-center gap-2">
                  {processo.notificacoes.length > 0 && <Badge tone="red">{processo.notificacoes.length} novo(s)</Badge>}
                  <span className="text-xs text-muted">{processo.seiProtocolos.length} protocolo(s)</span>
                </span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <div className="mb-3 flex flex-wrap gap-3 text-xs">
                  <a href={processo.seiUrl ?? "#"} target="_blank" rel="noreferrer" className="text-navy-600 underline">Abrir processo SEI ↗</a>
                  <a href={`/processos/${processo.id}`} className="text-navy-600 underline">Ver processo no sistema ↗</a>
                </div>
                {processo.seiProtocolos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-muted">
                        <tr>
                          <th className="px-3 py-2">Protocolo</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Data</th>
                          <th className="px-3 py-2">Unidade</th>
                          <th className="px-3 py-2"><span className="sr-only">Ações</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {processo.seiProtocolos.map((p) => {
                          const url = safeExternalUrl(p.url);
                          return (
                            <tr key={p.numero}>
                              <td className="px-3 py-2">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-navy-600 underline">{p.numero} ↗</a> : p.numero}</td>
                              <td className="px-3 py-2">{p.tipo}</td>
                              <td className="px-3 py-2 text-muted">{p.data}</td>
                              <td className="px-3 py-2">{p.unidade}</td>
                              <td className="px-3 py-2 text-right">
                                <CriarTarefaNotificacao
                                  mensagem={`Protocolo SEI ${p.numero} (${p.tipo}) — processo ${processo.numero}`}
                                  processoId={processo.id}
                                  processoNumero={processo.numero}
                                  pessoas={pessoas}
                                  isAdmin={isAdmin}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Nenhum protocolo persistido. Execute a consulta para buscar.</p>
                )}
              </div>
            </details>
          </Card>
        ))}
        {processos.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">Nenhum processo com URL pública do SEI cadastrada.</Card>
        )}
      </div>
    </div>
  );
}
