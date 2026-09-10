import { requirePermissao } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge } from "@/components/ui";
import { safeExternalUrl } from "@/lib/urls";
import { DouConfigForm } from "@/components/ferramentas/DouConfigForm";

export default async function DouPage() {
  await requirePermissao("processo:ler");
  const avisos = await prisma.notificacao.findMany({ where: { tipo: "dou_notificacao" }, orderBy: { criadoEm: "desc" }, take: 200, include: { processo: { select: { id: true, numero: true } } } });
  return <div><PageHeader title="DOU" subtitle="Publicações do Diário Oficial da União relacionadas aos cadastros" /><Card className="mb-6 p-5"><h2 className="mb-3 text-base font-semibold text-navy-900">Configurações de captura</h2><p className="mb-4 text-sm text-muted">Os termos são montados automaticamente a partir de clientes, empreendimentos e processos ativos.</p><DouConfigForm /></Card><Card><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-navy-900">Publicações encontradas</h2></div><ul className="divide-y divide-slate-100">{avisos.map((n) => { const url = safeExternalUrl(n.url); return <li key={n.id} className="px-5 py-3"><div className="flex flex-wrap items-center gap-2"><Badge tone="blue">DOU</Badge><span className="text-sm font-medium text-navy-900">{n.mensagem}</span></div><div className="mt-1 flex flex-wrap gap-3 text-xs text-muted"><span>{formatDate(n.dataEvento ?? n.criadoEm)}</span>{n.processo && <a className="text-navy-600 hover:underline" href={`/processos/${n.processo.id}`}>Processo {n.processo.numero}</a>}{url && <a className="text-navy-600 underline" href={url} target="_blank" rel="noreferrer">Ver publicação ↗</a>}</div></li>; })}{avisos.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Nenhuma publicação encontrada.</li>}</ul></Card></div>;
}
