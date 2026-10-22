import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Search } from "lucide-react";
import { SelecaoLote, LinhaSelecionavel, BarraLote } from "@/components/cadastro/SelecaoLote";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function AreasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");

  const areas = await prisma.area.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" as const } },
              { municipio: { contains: q, mode: "insensitive" as const } },
              { tipo: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
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

      <SelecaoLote rota="/api/areas/excluir-lote" permitido={podeExcluir}>
      <Card>
        <BarraLote />
        <BuscaAuto placeholder="Buscar por nome, município ou tipo..." valorInicial={q} />
        <ul className="divide-y divide-slate-200">
          {areas.map((a) => (
            <LinhaSelecionavel key={a.id} id={a.id}>
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
            </LinhaSelecionavel>
          ))}
          {areas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma área cadastrada.
            </li>
          )}
        </ul>
      </Card>
      </SelecaoLote>
    </div>
  );
}
