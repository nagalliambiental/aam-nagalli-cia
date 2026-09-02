import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/processos/StatusBadge";
import { ArrowRight } from "lucide-react";
import { labelTipoEmpreendimento } from "@/lib/empreendimentos";

export default async function EmpreendimentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empreendimentoId = Number(id);
  await requirePermissao("cadastro:ler");

  const empreendimento = await prisma.empreendimento.findFirst({
    where: { id: empreendimentoId, ativo: true, deletedAt: null },
    include: {
      empresaPrincipal: true,
      areas: { include: { area: true } },
      empresas: { include: { empresa: true } },
      _count: { select: { licencas: true } },
    },
  });

  if (!empreendimento) notFound();

  // Processos ativos vinculados a este empreendimento (exclui os excluídos, sem órfãos)
  const processos = await prisma.processo.findMany({
    where: { empreendimentoId, ativo: true, deletedAt: null },
    orderBy: { dataAbertura: "desc" },
    include: { orgao: true, tipoProcesso: true },
  });

  return (
    <div>
      <PageHeader
        title={empreendimento.nome}
        subtitle={`${empreendimento.apelido ? `${empreendimento.apelido} · ` : ""}${empreendimento.tipo} · ${empreendimento.empresaPrincipal.razaoSocial}`}
        actions={
          <>
            <Link href="/empreendimentos">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/empreendimentos/${empreendimento.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Dados gerais" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
          {[
            ["Apelido", empreendimento.apelido ?? "—"],
            ["Tipo", labelTipoEmpreendimento(empreendimento.tipo)],
            ["Empresa principal", empreendimento.empresaPrincipal.razaoSocial],
            ["Município/UF", empreendimento.municipio && empreendimento.uf ? `${empreendimento.municipio}/${empreendimento.uf}` : "—"],
            ["Endereço", empreendimento.endereco ?? "—"],
            ["Status", <Badge key="s" tone={empreendimento.status === "ativo" ? "green" : "amber"}>{empreendimento.status}</Badge>],
            ["Processos", processos.length],
            ["Licenças", empreendimento._count.licencas],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-6 border-t border-slate-200 px-5 py-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-navy-900">Empresas envolvidas</h3>
            {empreendimento.empresas.length === 0 ? (
              <p className="text-sm text-muted">Apenas a principal.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {empreendimento.empresas.map((x) => (
                  <li key={x.id} className="flex items-center justify-between">
                    <span>{x.empresa.razaoSocial}</span>
                    <span className="text-xs text-muted">{x.papel}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title={`Processos (${processos.length})`} />
        <ul className="divide-y divide-slate-100">
          {processos.map((proc) => (
            <li key={proc.id}>
              <Link href={`/processos/${proc.id}`} className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">
                    {proc.numero}
                    {proc.nup ? <span className="ml-2 text-xs font-normal text-navy-600">NUP {proc.nup}</span> : null}
                  </p>
                  <p className="text-xs text-muted">{proc.tipoProcesso.nome} · {proc.orgao.sigla}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={proc.status} />
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                </div>
              </Link>
            </li>
          ))}
          {processos.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted">
              Nenhum processo vinculado a este empreendimento.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
