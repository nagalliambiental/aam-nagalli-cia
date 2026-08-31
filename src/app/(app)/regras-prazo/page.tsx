import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Button, Badge } from "@/components/ui";

export default async function RegrasPrazoPage() {
  await requirePermissao("config:ler");

  const regras = await prisma.regraPrazo.findMany({
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
