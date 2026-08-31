import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function TitulosPage() {
  const titulos = await prisma.tituloMinerario.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: [{ situacao: "asc" }, { validade: "asc" }],
    include: {
      tipoTitulo: true,
      orgao: true,
      _count: { select: { processos: true, areas: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Títulos minerários"
        subtitle="Alvarás de pesquisa, concessões de lavra e demais títulos"
        actions={
          <Link href="/titulos/novo">
            <Button>Novo título</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-200">
          {titulos.map((t) => (
            <li key={t.id}>
              <Link
                href={`/titulos/${t.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {t.numero} <span className="text-muted font-normal">· {t.orgao.sigla}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {t.tipoTitulo.nome}
                    {t.substancia ? ` · ${t.substancia}` : ""}
                    {t.municipio ? ` · ${t.municipio}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    {t.validade && <p>validade {formatDate(t.validade)}</p>}
                    <p>{t._count.areas} áreas</p>
                  </div>
                  <Badge tone={t.situacao === "ativo" ? "green" : "amber"}>{t.situacao}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {titulos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum título minerário cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
