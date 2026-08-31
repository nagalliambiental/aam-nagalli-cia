import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function RegrasPrazoPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("config:ler");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const regras = await prisma.regraPrazo.findMany({
    where: q
      ? {
          OR: [
            { acaoGerada: { contains: q, mode: "insensitive" as const } },
            { tarefaGerada: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {},
    orderBy: [{ ativo: "desc" }, { orgaoId: "asc" }],
    include: {
      orgao: true,
      tipoProcesso: true,
      tipoEvento: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Regras de prazo"
        subtitle="Automação de cálculo e geração de prazos/tarefas"
        actions={
          <Link href="/regras-prazo/nova">
            <Button>Nova regra</Button>
          </Link>
        }
      />

      <Card>
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por ação ou tarefa gerada..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {regras.map((r) => (
            <li key={r.id}>
              <Link
                href={`/regras-prazo/${r.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {r.orgao.sigla}
                    {r.tipoProcesso ? ` · ${r.tipoProcesso.nome}` : " · (qualquer tipo)"}
                    {r.tipoEvento ? ` · ${r.tipoEvento.nome}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {r.dataFixa
                      ? `data fixa ${r.dataFixa.toLocaleDateString("pt-BR")}`
                      : `${r.quantidade} ${r.unidade}`}
                    {r.acaoGerada ? ` → ${r.acaoGerada}` : ""}
                    {r.tarefaGerada ? ` · tarefa: ${r.tarefaGerada}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">v{r.versao}</span>
                  <Badge tone={r.ativo ? "green" : "gray"}>
                    {r.ativo ? "ativa" : "inativa"}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
          {regras.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma regra de prazo cadastrada.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
