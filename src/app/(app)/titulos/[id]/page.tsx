import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function TituloDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tituloId = Number(id);
  await requirePermissao("cadastro:ler");

  const titulo = await prisma.tituloMinerario.findFirst({
    where: { id: tituloId, ativo: true, deletedAt: null },
    include: {
      tipoTitulo: true,
      orgao: true,
      responsavel: true,
      areas: { include: { area: true } },
      processos: { include: { processo: { include: { orgao: true } } } },
      _count: { select: { prazos: true, tarefas: true } },
    },
  });
  if (!titulo) notFound();

  return (
    <div>
      <PageHeader
        title={`Título ${titulo.numero}`}
        subtitle={`${titulo.tipoTitulo.nome} · ${titulo.orgao.sigla}`}
        actions={
          <>
            <Link href="/titulos">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/titulos/${titulo.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Dados gerais" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
          {[
            ["Tipo", titulo.tipoTitulo.nome],
            ["Órgão", `${titulo.orgao.sigla} — ${titulo.orgao.nome}`],
            ["Substância", titulo.substancia ?? "—"],
            ["Município/UF", titulo.municipio && titulo.uf ? `${titulo.municipio}/${titulo.uf}` : "—"],
            ["Emissão", titulo.dataEmissao ? formatDate(titulo.dataEmissao) : "—"],
            ["Validade", titulo.validade ? formatDate(titulo.validade) : "—"],
            ["Situação", <Badge key="s" tone={titulo.situacao === "ativo" ? "green" : "amber"}>{titulo.situacao}</Badge>],
            ["Responsável", titulo.responsavel?.nome ?? "—"],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-6 border-t border-slate-200 px-5 py-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-navy-900">Áreas vinculadas</h3>
            {titulo.areas.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma área.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {titulo.areas.map((a) => <li key={a.id}>{a.area.nome}</li>)}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-navy-900">Processos vinculados</h3>
            {titulo.processos.length === 0 ? (
              <p className="text-sm text-muted">Nenhum processo.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {titulo.processos.map((x) => (
                  <li key={x.id}>
                    <Link href={`/processos/${x.processo.id}`} className="text-navy-700 underline">
                      #{x.processo.numero} ({x.processo.orgao.sigla})
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
