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

export default async function LicencasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pagina = Math.max(1, Number(typeof sp.pagina === "string" ? sp.pagina : 1) || 1);
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");

  const filtro = {
    ativo: true,
    deletedAt: null,
    ...(q ? { numero: { contains: q, mode: "insensitive" as const } } : {}),
  } as const;

  const [licencas, total] = await Promise.all([
    prisma.licenca.findMany({
      where: filtro,
      orderBy: [{ situacao: "asc" }, { dataValidade: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        tipoLicenca: true,
        orgao: true,
        empreendimento: true,
        _count: { select: { condicionantes: true } },
      },
    }),
    prisma.licenca.count({ where: filtro }),
  ]);

  const construirPagina = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("pagina", String(p));
    return `/licencas?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Licenças"
        subtitle="Licenças ambientais (LP, LI, LO...) e vínculos"
        actions={
          <Link href="/licencas/nova">
            <Button>Nova licença</Button>
          </Link>
        }
      />

      <SelecaoLote rota="/api/licencas/excluir-lote" permitido={podeExcluir} total={total} filtroTudo={{ q: q || undefined }}>
      <Card>
        <BarraLote />
        <BuscaAuto placeholder="Buscar por número..." valorInicial={q} />
        <ul className="divide-y divide-slate-200">
          {licencas.map((l) => (
            <LinhaSelecionavel key={l.id} id={l.id}>
              <Link
                href={`/licencas/${l.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {l.numero} <span className="text-muted font-normal">· {l.orgao.sigla}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {l.tipoLicenca.nome}
                    {l.empreendimento ? ` · ${l.empreendimento.apelido || l.empreendimento.nome}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    {l.dataValidade && <p>validade {formatDate(l.dataValidade)}</p>}
                    <p>{l._count.condicionantes} condicionantes</p>
                  </div>
                  <Badge tone={l.situacao === "ativa" ? "green" : "amber"}>{l.situacao}</Badge>
                </div>
              </Link>
            </LinhaSelecionavel>
          ))}
          {licencas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma licença cadastrada.
            </li>
          )}
        </ul>
        <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} construirHref={construirPagina} />
      </Card>
      </SelecaoLote>
    </div>
  );
}
