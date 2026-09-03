import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader, Badge } from "@/components/ui";
import { formatDate, formatMoney, formatCNPJ } from "@/lib/format";
import { ImprimirBotao } from "@/components/ImprimirBotao";

const STATUS: Record<string, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  aberta: { label: "Aberta", tone: "blue" },
  enviada: { label: "Enviada", tone: "amber" },
  paga: { label: "Paga", tone: "green" },
  cancelada: { label: "Cancelada", tone: "gray" },
};

const PAGAMENTO = `Nagalli & Cia LTDA.\nChave PIX: CNPJ 02.836.099/0001-91\nBanco do Brasil: 001; Agência 4500-4; Conta Corrente 27.366-0`;

export default async function FaturaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (s?.user?.perfilNome !== "Administrador") redirect("/");
  const { id } = await params;

  const fatura = await prisma.fatura.findFirst({
    where: { id: Number(id), ativo: true, deletedAt: null },
    include: { empresa: true, empreendimento: true, itens: { orderBy: { id: "asc" } } },
  });
  if (!fatura) notFound();
  const st = STATUS[fatura.status] ?? { label: fatura.status, tone: "gray" as const };
  const total = fatura.itens.reduce((x, i) => x + Number(i.total), 0);

  return (
    <div>
      <PageHeader
        title={`Fatura Nº ${fatura.numero}/${fatura.ano}`}
        subtitle={fatura.empresa.nomeFantasia || fatura.empresa.razaoSocial}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <Badge tone={st.tone}>{st.label}</Badge>
            <ImprimirBotao />
            <Link href="/faturas">
              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-navy-600 ring-1 ring-slate-200 hover:bg-slate-100">Voltar</span>
            </Link>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white print:border-0 print:shadow-none">
        {/* Cabeçalho azul marinho */}
        <div className="grid grid-cols-2" style={{ backgroundColor: "#021E4C" }}>
          <div className="flex items-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="AAM" className="h-16 object-contain" />
          </div>
          <div className="flex items-center justify-center p-4 text-center">
            <p className="text-xl font-bold tracking-wide text-white">FATURA Nº {fatura.numero} / {fatura.ano}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-slate-300 text-sm">
          <div className="border-b border-r border-slate-300 bg-slate-50 px-4 py-2 text-center font-bold text-navy-900">CLIENTE</div>
          <div className="border-b border-slate-300 bg-slate-50 px-4 py-2 text-center font-bold text-navy-900">{fatura.empresa.razaoSocial}</div>
          <div className="border-b border-r border-slate-300 bg-slate-50 px-4 py-2 text-center font-bold text-navy-900">CNPJ</div>
          <div className="border-b border-slate-300 px-4 py-2 text-center">{fatura.empresa.cnpj ? formatCNPJ(fatura.empresa.cnpj) : "—"}</div>
          <div className="border-b border-r border-slate-300 bg-slate-50 px-4 py-2 text-center font-bold text-navy-900">REFERÊNCIA</div>
          <div className="border-b border-slate-300 px-4 py-2 text-center font-semibold">{fatura.referencia || fatura.empreendimento?.nome || "—"}</div>
          <div className="border-b border-r border-slate-300 bg-slate-50 px-4 py-2 text-center font-bold text-navy-900">PERÍODO / VENCIMENTO</div>
          <div className="border-b border-slate-300 px-4 py-2 text-center">{fatura.periodo || "—"}{fatura.vencimento ? ` · Venc.: ${formatDate(fatura.vencimento)}` : ""}</div>
          <div className="border-r border-slate-300 bg-slate-50 px-4 py-2 text-center font-bold text-navy-900">PAGAMENTO</div>
          <div className="whitespace-pre-line px-4 py-2 text-center">{PAGAMENTO}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Identificação</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-right">Qtde</th>
                <th className="px-3 py-2 text-right">Hora téc. (R$)</th>
                <th className="px-3 py-2 text-right">Desc. (%)</th>
                <th className="px-3 py-2 text-right">Desc. valor</th>
                <th className="px-3 py-2 text-right">Outros (R$)</th>
                <th className="px-3 py-2 text-right">Adm/Fisc. (R$)</th>
                <th className="px-3 py-2 text-right">Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {fatura.itens.map((it) => (
                <tr key={it.id} className="border-t border-slate-200 align-top">
                  <td className="px-3 py-2">{it.data ? formatDate(it.data) : "—"}</td>
                  <td className="px-3 py-2 font-medium">{it.identificacao}</td>
                  <td className="whitespace-pre-wrap px-3 py-2">{it.descricao || "—"}</td>
                  <td className="px-3 py-2 text-right">{Number(it.qtde)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(it.horaTecnica)}</td>
                  <td className="px-3 py-2 text-right">{it.descontoPct != null ? `${Number(it.descontoPct)}%` : "—"}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(it.descontoValor)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(it.outrosCustos)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(it.custosAdmFiscais)}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatMoney(it.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-900">
                <td colSpan={9} className="px-3 py-3 text-right font-bold text-navy-900">TOTAL GERAL</td>
                <td className="px-3 py-3 text-right text-base font-bold text-navy-900">{formatMoney(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
