import { requirePermissao, requireAuth } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge } from "@/components/ui";
import { safeExternalUrl } from "@/lib/urls";
import { DouConfigForm } from "@/components/ferramentas/DouConfigForm";
import { DouFiltroForm } from "@/components/ferramentas/DouFiltroForm";
import { CriarTarefaNotificacao } from "@/components/notificacoes/CriarTarefaNotificacao";
import { montarTermosDou } from "@/lib/dou-termos";

type SearchParams = Promise<{ periodo?: string | string[]; inicio?: string | string[]; fim?: string | string[] }>;

export default async function DouPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("processo:ler");
  const user = await requireAuth();
  const isAdmin = user.perfilNome === "Administrador";
  const sp = await searchParams;
  const periodo = typeof sp.periodo === "string" ? sp.periodo : "30";
  const inicioParam = typeof sp.inicio === "string" ? sp.inicio : "";
  const fimParam = typeof sp.fim === "string" ? sp.fim : "";

  const [avisos, config, empresas, empreendimentos, processos, pessoas] = await Promise.all([
    prisma.notificacao.findMany({ where: { tipo: "dou_notificacao" }, orderBy: { criadoEm: "desc" }, take: 500, include: { processo: { select: { id: true, numero: true } } } }),
    prisma.douConfiguracao.findUnique({ where: { id: 1 } }),
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, select: { cnpj: true, cpf: true, razaoSocial: true, nomeFantasia: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { nome: true, apelido: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, select: { numero: true, nup: true } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const termos = montarTermosDou(empresas, empreendimentos, processos, (config?.termosExtras ?? "").split(/\r?\n/).filter(Boolean));

  const dias = periodo === "60" ? 60 : periodo === "90" ? 90 : periodo === "personalizado" ? 0 : 30;
  const agora = new Date();
  const fimDt = periodo === "personalizado" && fimParam
    ? new Date(`${fimParam}T23:59:59`)
    : new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
  const inicioDt = periodo === "personalizado"
    ? (inicioParam ? new Date(`${inicioParam}T00:00:00`) : new Date(0))
    : new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - dias, 0, 0, 0, 0);
  const filtrados = avisos.filter((n) => {
    const d = new Date(n.dataEvento ?? n.criadoEm);
    return d >= inicioDt && d <= fimDt;
  });

  const periodoLabel = periodo === "personalizado"
    ? `${inicioParam || "início"} a ${fimParam || "hoje"}`
    : `Últimos ${dias} dias`;

  return (
    <div>
      <PageHeader title="DOU" subtitle="Publicações do Diário Oficial da União relacionadas aos cadastros" />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-navy-900">Publicações encontradas</h2>
          <Badge tone="blue">{filtrados.length} em {periodoLabel}</Badge>
        </div>
        <DouFiltroForm periodoInicial={periodo} inicioInicial={inicioParam} fimInicial={fimParam} />
        <ul className="divide-y divide-slate-100">
          {filtrados.map((n) => {
            const url = safeExternalUrl(n.url);
            return (
              <li key={n.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">DOU</Badge>
                    <span className="text-sm font-medium text-navy-900">{n.mensagem}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                    <span>{formatDate(n.dataEvento ?? n.criadoEm)}</span>
                    {n.processo && <a className="text-navy-600 hover:underline" href={`/processos/${n.processo.id}`}>Processo {n.processo.numero}</a>}
                    {url && <a className="text-navy-600 underline" href={url} target="_blank" rel="noreferrer">Ver publicação ↗</a>}
                  </div>
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
            );
          })}
          {filtrados.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Nenhuma publicação no período selecionado.</li>}
        </ul>
      </Card>

      <Card className="mb-6">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
            <span className="text-base font-semibold text-navy-900">Termos usados na busca</span>
            <Badge tone="gray">{termos.length}</Badge>
          </summary>
          <div className="border-t border-slate-200 p-4">
            <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200">
              {termos.map((termo) => (
                <div key={`${termo.origem}-${termo.text}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-0">
                  <span className="break-words text-sm font-medium text-navy-900">{termo.text}</span>
                  <span className="text-xs text-muted">{termo.origem}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </Card>

      <Card>
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
            <span className="text-base font-semibold text-navy-900">Configurações de captura</span>
            <span className="text-xs text-muted">Horário e termos manuais</span>
          </summary>
          <div className="border-t border-slate-200 p-5">
            <p className="mb-4 text-sm text-muted">Os termos automáticos usam CNPJ, CPF, razão social, nome fantasia, nome do empreendimento, NUP e número do processo. Apelidos não são usados.</p>
            <DouConfigForm />
          </div>
        </details>
      </Card>
    </div>
  );
}
