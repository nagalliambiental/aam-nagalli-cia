import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";

export default async function EmpreendimentosPage() {
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
    include: {
      empresaPrincipal: true,
      _count: { select: { areas: true, processos: true, licencas: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Empreendimentos"
        subtitle="Unidades operacionais e seus vínculos"
        actions={
          <Link href="/empreendimentos/nova">
            <Button>Novo empreendimento</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-200">
          {empreendimentos.map((e) => (
            <li key={e.id}>
              <Link
                href={`/empreendimentos/${e.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">{e.nome}</p>
                  <p className="text-sm text-muted">
                    {e.tipo}
                    {e.municipio && e.uf ? ` · ${e.municipio}/${e.uf}` : ""}
                    {e.empresaPrincipal ? ` · ${e.empresaPrincipal.razaoSocial}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>
                      {e.areaValor != null ? `${e.areaValor} ${e.areaUnidade}` : ""}
                      {e.areaValor != null ? " · " : ""}{e._count.processos} processos
                    </p>
                  </div>
                  <Badge tone={e.status === "ativo" ? "green" : "amber"}>{e.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {empreendimentos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum empreendimento cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
