import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { NovoCustoForm } from "@/components/financeiro/NovoCustoForm";

export default async function FinanceiroPage() {
  await requirePermissao("relatorio:ler");

  const custos = await prisma.custo.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { data: "desc" },
    include: {
      processo: { include: { empreendimento: true } },
      responsavel: true,
    },
  });

  const contratos = await prisma.contrato.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { dataAssinatura: "desc" },
    include: { empresa: true },
  });

  const processos = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { dataAbertura: "desc" },
    select: { id: true, numero: true, orgao: { select: { sigla: true } } },
  });

  const total = custos.reduce((a, c) => a + c.valor.toNumber(), 0);
  const totalPago = custos
    .filter((c) => c.status === "pago")
    .reduce((a, c) => a + c.valor.toNumber(), 0);
  const totalPendente = total - totalPago;

  // por cliente (empresa)
  const porCliente = new Map<number, { nome: string; total: number }>();
  // por empreendimento
  const porEmpreendimento = new Map<number, { nome: string; total: number }>();
  for (const c of custos) {
    const emp = c.processo?.empreendimento;
    if (emp) {
      porEmpreendimento.set(emp.id, {
        nome: emp.nome,
        total: (porEmpreendimento.get(emp.id)?.total ?? 0) + c.valor.toNumber(),
      });
    }
    // cliente = empresa associada (via ProcessoEmpresa papel cliente) - simplificado: usar nome do processo
  }

  const bars = (data: { nome: string; total: number }[]) => {
    const max = Math.max(1, ...data.map((d) => d.total));
    return (
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.nome} className="flex items-center gap-3">
            <span className="w-40 truncate text-sm text-muted">{d.nome}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full rounded bg-navy-700"
                style={{ width: `${(d.total / max) * 100}%` }}
              />
            </div>
            <span className="w-28 text-right text-sm font-semibold">
              R$ {d.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted">Sem dados.</p>}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Contratos e consolidação de custos"
        actions={
          <Link href="/contratos/nova">
            <Button>Novo contrato</Button>
          </Link>
        }
      />

      <div className="mb-6">
        <NovoCustoForm processos={processos.map((p) => ({ id: p.id, numero: p.numero, orgao: p.orgao.sigla }))} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Custo total", total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
          ["Pago", totalPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
          ["Pendente", totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
        ].map(([k, v]) => (
          <Card key={k}>
            <div className="p-5">
              <p className="text-sm text-muted">{k}</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{v}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Custos por empreendimento" />
          <div className="p-5">{bars([...porEmpreendimento.values()].sort((a, b) => b.total - a.total))}</div>
        </Card>
        <Card>
          <CardHeader title="Registros de custo" />
          <ul className="divide-y divide-slate-100">
            {custos.slice(0, 12).map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-navy-900">{c.descricao}</p>
                  <p className="text-xs text-muted">
                    {c.tipo}
                    {c.processo ? ` · #${c.processo.numero}` : ""}
                    {c.data ? ` · ${formatDate(c.data)}` : ""}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${c.status === "pago" ? "text-green-700" : "text-amber-700"}`}>
                  R$ {c.valor.toNumber().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
            {custos.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">Nenhum custo registrado.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Contratos" />
        <ul className="divide-y divide-slate-200">
          {contratos.map((co) => (
            <li key={co.id}>
              <Link
                href={`/contratos/${co.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {co.empresa.nomeFantasia ?? co.empresa.razaoSocial}
                    {co.numero ? ` — ${co.numero}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {co.descricao ?? "Contrato"}
                    {co.dataAssinatura ? ` · ${formatDate(co.dataAssinatura)}` : ""}
                    {co.dataValidade ? ` → ${formatDate(co.dataValidade)}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {contratos.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted">Nenhum contrato.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
