import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/format";

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

  return (
    <div>
      <PageHeader
        title="Faturas"
        subtitle="Cobrança aos clientes (somente administrador)"
        actions={<Link href="/faturas/nova"><Button>Nova fatura</Button></Link>}
      />
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
                    <p className="text-xs text-muted">{f.itens.length} item(ns){f.referencia ? ` · ${f.referencia}` : ""}</p>
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
