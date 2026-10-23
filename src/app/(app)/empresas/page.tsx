import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button, Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { formatDocumento } from "@/lib/format";
import { Search } from "lucide-react";
import { ImportarClientes } from "@/components/empresas/ImportarClientes";
import { SelecaoLote, LinhaSelecionavel, BarraLote } from "@/components/cadastro/SelecaoLote";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { Paginacao } from "@/components/ui/Paginacao";
import { EmpreendimentoDropdown } from "@/components/EmpreendimentoDropdown";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[]; tipo?: string | string[]; pagina?: string | string[] }>;

const POR_PAGINA = 20;

export default async function EmpresasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tipo = typeof sp.tipo === "string" && (sp.tipo === "pj" || sp.tipo === "pf") ? sp.tipo : "";
  const pagina = Math.max(1, Number(typeof sp.pagina === "string" ? sp.pagina : 1) || 1);
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");
  const qDigitos = q.replace(/\D/g, "");

  const filtro = {
    ativo: true,
    deletedAt: null,
    ...(tipo === "pj" || tipo === "pf" ? { tipoPessoa: tipo === "pj" ? "juridica" : "fisica" } : {}),
    ...(q
      ? {
          OR: [
            { razaoSocial: { contains: q, mode: "insensitive" as const } },
            { nomeFantasia: { contains: q, mode: "insensitive" as const } },
            { apelido: { contains: q, mode: "insensitive" as const } },
            { cnpj: { contains: q, mode: "insensitive" as const } },
            { cpf: { contains: q, mode: "insensitive" as const } },
            { municipio: { contains: q, mode: "insensitive" as const } },
            { bairro: { contains: q, mode: "insensitive" as const } },
            { complemento: { contains: q, mode: "insensitive" as const } },
            ...(qDigitos ? [{ cnpj: { contains: qDigitos } }, { cpf: { contains: qDigitos } }] : []),
          ],
        }
      : {}),
  } as const;

  const [empresas, total] = await Promise.all([
    prisma.empresa.findMany({
      where: filtro,
      orderBy: { razaoSocial: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        _count: { select: { empreendimentosPrincipais: { where: { ativo: true, deletedAt: null } } } },
        empreendimentosPrincipais: {
          where: { ativo: true, deletedAt: null },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true, apelido: true },
        },
      },
    }),
    prisma.empresa.count({ where: filtro }),
  ]);

  const construirPagina = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo) params.set("tipo", tipo);
    params.set("pagina", String(p));
    return `/empresas?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes"
        actions={
          <div className="flex items-center gap-2">
            <ImportarClientes />
            <Link href="/api/relatorios/clientes/xlsx" target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar XLSX</Button>
            </Link>
            <Link href="/api/relatorios/clientes/pdf" target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar PDF</Button>
            </Link>
            <Link href="/api/relatorios/clientes/modelo" target="_blank" rel="noreferrer">
              <Button variant="ghost">Modelo</Button>
            </Link>
            <Link href="/empresas/nova">
              <Button>Novo cliente</Button>
            </Link>
          </div>
        }
      />

      <SelecaoLote rota="/api/empresas/excluir-lote" permitido={podeExcluir}>
      <Card>
        <BarraLote />
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 pt-2">
          <div className="flex w-full">
            <BuscaAuto placeholder="Buscar por nome, apelido, CPF/CNPJ, bairro ou município..." valorInicial={q} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tipo:</span>
            {(["", "pj", "pf"] as const).map((t) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (t) params.set("tipo", t);
              return (
                <Link
                  key={t || "todos"}
                  href={`/empresas?${params.toString()}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    tipo === t ? "bg-navy-900 text-white" : "text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t === "" ? "Todos" : t.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>
        <ul className="divide-y divide-slate-200">
          {empresas.map((e) => (
            <LinhaSelecionavel key={e.id} id={e.id}>
              <div className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50">
                <Link href={`/empresas/${e.id}`} className="min-w-0 flex-1">
                  <p className="font-medium text-navy-900">
                    {e.razaoSocial}
                    {e.apelido ? <span className="ml-2 text-xs font-normal text-navy-600">· {e.apelido}</span> : null}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
                      {(e as { tipoPessoa?: string }).tipoPessoa === "fisica" ? "PF" : "PJ"}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {formatDocumento(e as { tipoPessoa?: string | null; cnpj?: string | null; cpf?: string | null })}
                    {e.municipio && e.uf ? ` · ${e.municipio}/${e.uf}` : ""}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right text-sm text-muted hidden sm:block">
                    <p>{e._count.empreendimentosPrincipais} empreend.</p>
                  </div>
                  {e.empreendimentosPrincipais.length > 0 && (
                    <EmpreendimentoDropdown empreendimentos={e.empreendimentosPrincipais} />
                  )}
                  <Badge tone={e.ativo ? "green" : "gray"}>
                    {e.ativo ? "ativo" : "inativo"}
                  </Badge>
                </div>
              </div>
            </LinhaSelecionavel>
          ))}
          {empresas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum cliente cadastrado ainda.
            </li>
          )}
        </ul>
        <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} construirHref={construirPagina} />
      </Card>
      </SelecaoLote>
    </div>
  );
}
