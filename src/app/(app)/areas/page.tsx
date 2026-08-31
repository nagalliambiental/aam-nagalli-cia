import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";

export default async function AreasPage() {
  const areas = await prisma.area.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { empreendimentos: true, processos: true, titulos: true, licencas: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Áreas"
        subtitle="Imóveis e áreas de operação"
        actions={
          <Link href="/areas/nova">
            <Button>Nova área</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-200">
          {areas.map((a) => (
            <li key={a.id}>
              <Link
                href={`/areas/${a.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">{a.nome}</p>
                  <p className="text-sm text-muted">
                    {a.tipo}
                    {a.areaHa ? ` · ${a.areaHa} ha` : ""}
                    {a.municipio && a.uf ? ` · ${a.municipio}/${a.uf}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>{a._count.titulos} títulos</p>
                    <p>{a._count.licencas} licenças</p>
                  </div>
                  <Badge tone={a.situacao === "ativa" ? "green" : "amber"}>{a.situacao}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {areas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma área cadastrada.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
