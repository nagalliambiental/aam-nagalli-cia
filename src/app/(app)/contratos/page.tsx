import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, PageHeader, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";
import { SelecaoLote, BarraLote, LinhaSelecionavelTabela } from "@/components/cadastro/SelecaoLote";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function ContratosPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("cadastro:ler");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");

  const contratos = await prisma.contrato.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" as const } },
              { descricao: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { dataAssinatura: "desc" },
    include: { empresa: true },
  });

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Contratos comerciais com clientes"
        actions={
          <Link href="/contratos/nova">
            <Button>Novo contrato</Button>
          </Link>
        }
      />

      <SelecaoLote rota="/api/contratos/excluir-lote" permitido={podeExcluir}>
      <Card>
        <BarraLote />
        <BuscaAuto placeholder="Buscar por número ou descrição..." valorInicial={q} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-muted">
                {podeExcluir && <th className="w-8" aria-label="Selecionar" />}
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Número</th>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Assinatura</th>
                <th className="px-5 py-3">Validade</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const expirado = c.dataValidade && c.dataValidade < new Date();
                return (
                  <LinhaSelecionavelTabela key={c.id} id={c.id}>
                    <td className="px-5 py-3 font-medium text-navy-900" style={{ width: "auto" }}>
                      <Link href={`/contratos/${c.id}`} className="hover:underline">
                        {c.empresa.nomeFantasia ?? c.empresa.razaoSocial}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{c.numero ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{c.descricao ?? "—"}</td>
                    <td className="px-5 py-3">
                      {c.dataAssinatura ? formatDate(c.dataAssinatura) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {c.dataValidade ? formatDate(c.dataValidade) : "—"}
                    </td>
                    <td className="px-5 py-3 pr-5">
                      {expirado ? (
                        <Badge tone="red">Expirado</Badge>
                      ) : c.dataValidade ? (
                        <Badge tone="green">Vigente</Badge>
                      ) : (
                        <Badge tone="blue">Sem validade</Badge>
                      )}
                    </td>
                  </LinhaSelecionavelTabela>
                );
              })}
              {contratos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </SelecaoLote>
    </div>
  );
}
