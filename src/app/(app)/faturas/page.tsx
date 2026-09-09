import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";

const STATUS: Record<string, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  aberta: { label: "Aberta", tone: "blue" },
  enviada: { label: "Enviada", tone: "amber" },
  paga: { label: "Paga", tone: "green" },
  cancelada: { label: "Cancelada", tone: "gray" },
};

export default async function FaturasPage() {
  const s = await auth();
  if (s?.user?.perfilNome !== "Administrador") redirect("/");

  const faturas = await prisma.fatura.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
    include: { empresa: true, itens: true },
  });
  const hoje = new Date();
  const total = (items: typeof faturas) => items.reduce((sum, f) => sum + f.itens.reduce((subtotal, item) => subtotal + Number(item.total), 0), 0);
  const valorTotal = total(faturas);
  const recebidas = faturas.filter((f) => f.recebidoEm || f.status === "paga");
  const emAberto = faturas.filter((f) => !f.recebidoEm && f.status !== "paga" && f.status !== "cancelada");
  const vencidas = emAberto.filter((f) => f.vencimento && new Date(f.vencimento) < hoje);

  return (
    <div>
      <PageHeader
        title="Faturas"
        subtitle="Cobrança aos clientes (somente administrador)"
        actions={<Link href="/faturas/nova"><Button>Nova fatura</Button></Link>}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-navy-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Faturado</p>
          <p className="mt-2 text-2xl font-bold text-navy-900">{formatMoney(valorTotal)}</p>
          <p className="mt-1 text-xs text-muted">{faturas.length} fatura(s)</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">A receber</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{formatMoney(total(emAberto))}</p>
          <p className="mt-1 text-xs text-muted">{emAberto.length} em aberto</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recebido</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(total(recebidas))}</p>
          <p className="mt-1 text-xs text-muted">{recebidas.length} recebida(s)</p>
        </Card>
        <Card className="border-l-4 border-l-red-500 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Em atraso</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatMoney(total(vencidas))}</p>
          <p className="mt-1 text-xs text-muted">{vencidas.length} vencida(s)</p>
        </Card>
      </div>
      <Card>
        <ul className="divide-y divide-slate-100">
          {faturas.map((f) => {
            const total = f.itens.reduce((s, i) => s + Number(i.total), 0);
            const st = STATUS[f.status] ?? { label: f.status, tone: "gray" as const };
            return (
              <li key={f.id}>
                <Link href={`/faturas/${f.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-navy-900">
                      Fatura Nº {f.numero}/{f.ano}
                      <span className="ml-2 font-normal text-muted">· {f.empresa.nomeFantasia || f.empresa.razaoSocial}</span>
                    </p>
                    <p className="text-xs text-muted">{f.itens.length} item(ns){f.referencia ? ` · ${f.referencia}` : ""}{f.recebidoEm ? ` · Recebida em ${formatDateTime(f.recebidoEm)}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-navy-900">{formatMoney(total)}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
          {faturas.length === 0 && <li className="px-5 py-12 text-center text-sm text-muted">Nenhuma fatura gerada ainda.</li>}
        </ul>
      </Card>
    </div>
  );
}
