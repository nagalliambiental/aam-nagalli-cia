import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";

export default async function AreaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const areaId = Number(id);
  await requirePermissao("cadastro:ler");

  const area = await prisma.area.findFirst({
    where: { id: areaId, ativo: true, deletedAt: null },
    include: { _count: { select: { empreendimentos: true, titulos: true, licencas: true, processos: true } } },
  });
  if (!area) notFound();

  return (
    <div>
      <PageHeader
        title={area.nome}
        subtitle={`${area.tipo}${area.municipio ? ` · ${area.municipio}/${area.uf ?? ""}` : ""}`}
        actions={
          <>
            <Link href="/areas">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/areas/${area.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Dados gerais" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
          {[
            ["Tipo", area.tipo],
            ["Matrícula", area.matricula ?? "—"],
            ["Área (ha)", area.areaHa ?? "—"],
            ["Município/UF", area.municipio && area.uf ? `${area.municipio}/${area.uf}` : "—"],
            ["Situação", <Badge key="s" tone={area.situacao === "ativa" ? "green" : "amber"}>{area.situacao}</Badge>],
            ["Coordenadas", area.coordenadas ?? "—"],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {area.observacoes && (
          <div className="border-t border-slate-200 px-5 py-4 text-sm">
            <dt className="text-muted">Observações</dt>
            <dd className="mt-1 whitespace-pre-wrap">{area.observacoes}</dd>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 px-5 py-4 md:grid-cols-4">
          {[
            ["Empreendimentos", area._count.empreendimentos],
            ["Títulos", area._count.titulos],
            ["Licenças", area._count.licencas],
            ["Processos", area._count.processos],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-2xl font-bold text-navy-900">{v as number}</dd>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
