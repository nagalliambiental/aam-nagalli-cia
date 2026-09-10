import { requirePermissao } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge } from "@/components/ui";
import { safeExternalUrl } from "@/lib/urls";
import { DouConfigForm } from "@/components/ferramentas/DouConfigForm";
import { montarTermosDou } from "@/lib/dou-termos";

export default async function DouPage() {
  await requirePermissao("processo:ler");
  const [avisos, config, empresas, empreendimentos, processos] = await Promise.all([
    prisma.notificacao.findMany({ where: { tipo: "dou_notificacao" }, orderBy: { criadoEm: "desc" }, take: 200, include: { processo: { select: { id: true, numero: true } } } }),
    prisma.douConfiguracao.findUnique({ where: { id: 1 } }),
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, select: { cnpj: true, razaoSocial: true, nomeFantasia: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { nome: true, apelido: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, select: { numero: true, nup: true } }),
  ]);
  const termos = montarTermosDou(empresas, empreendimentos, processos, (config?.termosExtras ?? "").split(/\r?\n/).filter(Boolean));
  return <div><PageHeader title="DOU" subtitle="Publicações do Diário Oficial da União relacionadas aos cadastros" /><Card className="mb-6 p-5"><h2 className="mb-3 text-base font-semibold text-navy-900">Configurações de captura</h2><p className="mb-4 text-sm text-muted">Os termos automáticos são baseados nos dados ativos do sistema. Você pode adicionar termos manuais abaixo.</p><DouConfigForm /></Card><Card className="mb-6"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-navy-900">Termos usados na busca ({termos.length})</h2></div><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">{termos.map((termo) => <div key={`${termo.origem}-${termo.text}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"><p className="break-words text-sm font-medium text-navy-900">{termo.text}</p><p className="mt-0.5 text-xs text-muted">{termo.origem}</p></div>)}</div></Card><Card><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-navy-900">Publicações encontradas</h2></div><ul className="divide-y divide-slate-100">{avisos.map((n) => { const url = safeExternalUrl(n.url); return <li key={n.id} className="px-5 py-3"><div className="flex flex-wrap items-center gap-2"><Badge tone="blue">DOU</Badge><span className="text-sm font-medium text-navy-900">{n.mensagem}</span></div><div className="mt-1 flex flex-wrap gap-3 text-xs text-muted"><span>{formatDate(n.dataEvento ?? n.criadoEm)}</span>{n.processo && <a className="text-navy-600 hover:underline" href={`/processos/${n.processo.id}`}>Processo {n.processo.numero}</a>}{url && <a className="text-navy-600 underline" href={url} target="_blank" rel="noreferrer">Ver publicação ↗</a>}</div></li>; })}{avisos.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Nenhuma publicação encontrada.</li>}</ul></Card></div>;
}
