import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Search } from "lucide-react";
import { ImportarEmpreendimentos } from "@/components/empreendimentos/ImportarEmpreendimentos";
import { SelecaoLote, LinhaSelecionavel, BarraLote } from "@/components/cadastro/SelecaoLote";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { Paginacao } from "@/components/ui/Paginacao";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[]; pagina?: string | string[] }>;

const POR_PAGINA = 20;

export default async function EmpreendimentosPage({ searchParams }: { searchParams: SearchParams }) {
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
            { nome: { contains: q, mode: "insensitive" as const } },
            { apelido: { contains: q, mode: "insensitive" as const } },
            { municipio: { contains: q, mode: "insensitive" as const } },
            { tipo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  } as const;

  const [empreendimentos, total] = await Promise.all([
    prisma.empreendimento.findMany({
      where: filtro,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        empresaPrincipal: true,
        _count: { select: { areas: true, processos: { where: { ativo: true, deletedAt: null } }, licencas: true } },
      },
    }),
    prisma.empreendimento.count({ where: filtro }),
  ]);

  const construirPagina = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("pagina", String(p));
    return `/empreendimentos?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Empreendimentos"
        subtitle="Unidades operacionais e seus vínculos"
        actions={
          <div className="flex items-center gap-2">
            <ImportarEmpreendimentos />
            <Link href="/api/relatorios/empreendimentos/xlsx" target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar XLSX</Button>
            </Link>
            <Link href="/api/relatorios/empreendimentos/pdf" target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar PDF</Button>
            </Link>
            <Link href="/api/relatorios/empreendimentos/modelo" target="_blank" rel="noreferrer">
              <Button variant="ghost">Modelo</Button>
            </Link>
            <Link href="/empreendimentos/nova">
              <Button>Novo empreendimento</Button>
            </Link>
          </div>
        }
      />

      <SelecaoLote rota="/api/empreendimentos/excluir-lote" permitido={podeExcluir} total={total} filtroTudo={{ q: q || undefined }}>
      <Card>
        <BarraLote />
        <BuscaAuto placeholder="Buscar por nome, apelido, município ou tipo..." valorInicial={q} />
        <ul className="divide-y divide-slate-200">
          {empreendimentos.map((e) => (
            <LinhaSelecionavel key={e.id} id={e.id}>
              <Link
                href={`/empreendimentos/${e.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {e.nome}
                    {e.apelido ? <span className="ml-2 text-xs font-normal text-navy-600">· {e.apelido}</span> : null}
                    {((e as { filial?: boolean }).filial) ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">filial</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">
                    {e.tipo}
                    {e.municipio && e.uf ? ` · ${e.municipio}/${e.uf}` : ""}
                    {e.empresaPrincipal ? ` · ${e.empresaPrincipal.razaoSocial}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>{e._count.processos} processos</p>
                  </div>
                  <Badge tone={e.status === "ativo" ? "green" : "amber"}>{e.status}</Badge>
                </div>
              </Link>
            </LinhaSelecionavel>
          ))}
          {empreendimentos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum empreendimento cadastrado.
            </li>
          )}
        </ul>
        <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} construirHref={construirPagina} />
      </Card>
      </SelecaoLote>
    </div>
  );
}
