import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";
import { SelecaoLote, LinhaSelecionavel, BarraLote } from "@/components/cadastro/SelecaoLote";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { Paginacao } from "@/components/ui/Paginacao";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[]; pagina?: string | string[] }>;

const POR_PAGINA = 20;

export default async function TitulosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pagina = Math.max(1, Number(typeof sp.pagina === "string" ? sp.pagina : 1) || 1);
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");

  const filtro = {
    ativo: true,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { numero: { contains: q, mode: "insensitive" as const } },
            { substancia: { contains: q, mode: "insensitive" as const } },
            { municipio: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  } as const;

  const [titulos, total] = await Promise.all([
    prisma.tituloMinerario.findMany({
      where: filtro,
      orderBy: [{ situacao: "asc" }, { validade: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        tipoTitulo: true,
        orgao: true,
        _count: { select: { processos: true, areas: true } },
      },
    }),
    prisma.tituloMinerario.count({ where: filtro }),
  ]);

  const construirPagina = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("pagina", String(p));
    return `/titulos?${params.toString()}`;
  };

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

      <SelecaoLote rota="/api/titulos/excluir-lote" permitido={podeExcluir}>
      <Card>
        <BarraLote />
        <BuscaAuto placeholder="Buscar por número, substância ou município..." valorInicial={q} />
        <ul className="divide-y divide-slate-200">
          {titulos.map((t) => (
            <LinhaSelecionavel key={t.id} id={t.id}>
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
            </LinhaSelecionavel>
          ))}
          {titulos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum título minerário cadastrado.
            </li>
          )}
        </ul>
        <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} construirHref={construirPagina} />
      </Card>
      </SelecaoLote>
    </div>
  );
}
