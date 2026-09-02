import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button } from "@/components/ui";
import { Search } from "lucide-react";
import { ProcessoRowActions } from "@/components/processos/ProcessoRowActions";
import { filtroSegregacao, filtroProcesso } from "@/lib/segregacao";
import { usuarioTemPermissao } from "@/lib/perfil";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function ProcessosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { scoped, responsavelPessoaId } = await filtroSegregacao();
  const podeExcluir = await usuarioTemPermissao("processo:excluir");
  const podeCriar = await usuarioTemPermissao("processo:criar");

  const processos = await prisma.processo.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...filtroProcesso(scoped, responsavelPessoaId),
      ...(q
          ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" as const } },
              { nup: { contains: q, mode: "insensitive" as const } },
              { assunto: { contains: q, mode: "insensitive" as const } },
              { descricao: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { dataAbertura: "desc" },
    include: {
      orgao: true,
      tipoProcesso: true,
      empreendimento: true,
      _count: { select: { eventos: true, prazos: true, tarefas: true, exigencias: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Processos"
        subtitle="Hub operacional: processos minerários e ambientais"
        actions={
          podeCriar ? (
            <Link href="/processos/novo">
              <Button>Novo processo</Button>
            </Link>
          ) : undefined
        }
      />

      <Card>
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por número, NUP, assunto ou descrição..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <ul className="divide-y divide-slate-200">
          {processos.map((p) => (
            <li key={p.id}>
              <ProcessoRowActions processo={p} podeExcluir={podeExcluir} />
            </li>
          ))}
          {processos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum processo cadastrado ainda.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
