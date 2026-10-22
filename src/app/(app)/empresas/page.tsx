import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button, Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { formatDocumento } from "@/lib/format";
import { Search } from "lucide-react";
import { ImportarClientes } from "@/components/empresas/ImportarClientes";
import { SelecaoLote, LinhaSelecionavel, BarraLote } from "@/components/cadastro/SelecaoLote";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function EmpresasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");
  const qDigitos = q.replace(/\D/g, "");

  const empresas = await prisma.empresa.findMany({
    where: {
      ativo: true,
      deletedAt: null,
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
    },
    orderBy: { razaoSocial: "asc" },
    include: {
      _count: { select: { empreendimentosPrincipais: true } },
    },
  });

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
        <BuscaAuto placeholder="Buscar por nome, apelido, CPF/CNPJ, bairro ou município..." valorInicial={q} />
        <ul className="divide-y divide-slate-200">
          {empresas.map((e) => (
            <LinhaSelecionavel key={e.id} id={e.id}>
              <Link
                href={`/empresas/${e.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
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
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted">
                    <p>{e._count.empreendimentosPrincipais} empreend.</p>
                  </div>
                  <Badge tone={e.ativo ? "green" : "gray"}>
                    {e.ativo ? "ativo" : "inativo"}
                  </Badge>
                </div>
              </Link>
            </LinhaSelecionavel>
          ))}
          {empresas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum cliente cadastrado ainda.
            </li>
          )}
        </ul>
      </Card>
      </SelecaoLote>
    </div>
  );
}
