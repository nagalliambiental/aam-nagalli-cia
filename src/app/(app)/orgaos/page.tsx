import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Search } from "lucide-react";
import { SelecaoLote, LinhaSelecionavel, BarraLote } from "@/components/cadastro/SelecaoLote";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function OrgaosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");

  const orgaos = await prisma.orgao.findMany({
    where: {
      ativo: true,
      ...(q
        ? {
            OR: [
              { sigla: { contains: q, mode: "insensitive" as const } },
              { nome: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { sigla: "asc" },
    include: { _count: { select: { processos: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Órgãos"
        subtitle="Órgãos ambientais e minerários (ANM, IAT, IBAMA...)"
        actions={
          <Link href="/orgaos/nova">
            <Button>Novo órgão</Button>
          </Link>
        }
      />

      <SelecaoLote rota="/api/orgaos/excluir-lote" permitido={podeExcluir}>
      <Card>
        <BarraLote />
        <BuscaAuto placeholder="Buscar por sigla ou nome..." valorInicial={q} />
        <ul className="divide-y divide-slate-200">
          {orgaos.map((o) => (
            <LinhaSelecionavel key={o.id} id={o.id}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-navy-900">
                    {o.sigla} <span className="text-muted font-normal">· {o.nome}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {o.ambito} · {o.nivel} · {o._count.processos} processos
                  </p>
                </div>
                <Badge tone={o.ativo ? "green" : "gray"}>ativo</Badge>
              </div>
            </LinhaSelecionavel>
          ))}
          {orgaos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum órgão cadastrado.
            </li>
          )}
        </ul>
      </Card>
      </SelecaoLote>
    </div>
  );
}
