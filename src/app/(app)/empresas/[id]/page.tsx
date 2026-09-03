import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao, usuarioTemPermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";
import { formatCNPJ } from "@/lib/format";
import { DeleteEmpresaButton } from "@/components/forms/DeleteEmpresaButton";
import { EmpreendimentoDropdown } from "@/components/EmpreendimentoDropdown";
import { ArrowRight } from "lucide-react";
import { labelTipoEmpreendimento } from "@/lib/empreendimentos";

export default async function EmpresaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresaId = Number(id);
  await requirePermissao("cadastro:ler");

  const empresa = await prisma.empresa.findFirst({
    where: { id: empresaId, ativo: true, deletedAt: null },
    include: { contatos: { where: { ativo: true, deletedAt: null }, orderBy: { id: "asc" } } },
  });

  if (!empresa) notFound();

  // Empreendimentos da empresa (vínculo via empresaPrincipalId) + contagem de processos
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { empresaPrincipalId: empresaId, ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
    include: { _count: { select: { processos: { where: { ativo: true, deletedAt: null } } } } },
  });

  const podeEditar = await usuarioTemPermissao("cadastro:editar");
  const podeExcluir = await usuarioTemPermissao("cadastro:excluir");

  return (
    <div>
      <PageHeader
        title={empresa.razaoSocial}
        subtitle={empresa.apelido ? `${empresa.apelido} · ${empresa.nomeFantasia ?? "Sem nome fantasia"}` : empresa.nomeFantasia ?? "Sem nome fantasia"}
        actions={
          <div className="flex items-center gap-2">
            {empreendimentos.length > 0 && (
              <EmpreendimentoDropdown empreendimentos={empreendimentos.map((e) => ({ id: e.id, nome: e.nome, apelido: e.apelido }))} />
            )}
            <Link href="/empresas">
              <Button variant="ghost">Voltar</Button>
            </Link>
            {podeEditar && (
              <Link href={`/empresas/${empresa.id}/editar`}>
                <Button>Editar</Button>
              </Link>
            )}
            {podeExcluir && <DeleteEmpresaButton id={empresa.id} />}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Dados gerais" />
          <dl className="space-y-3 px-5 py-4 text-sm">
            {[
              ["Apelido", empresa.apelido ?? "—"],
              ["CNPJ", empresa.cnpj ? formatCNPJ(empresa.cnpj) : "—"],
              ["Inscrição estadual", empresa.inscricaoEstadual ?? "—"],
              ["Município/UF", empresa.municipio && empresa.uf ? `${empresa.municipio}/${empresa.uf}` : "—"],
              ["Endereço", `${empresa.endereco ?? "—"}${empresa.numeroEndereco ? `, ${empresa.numeroEndereco}` : ""}`],
              ["Status", <Badge key="s" tone={empresa.ativo ? "green" : "gray"}>{empresa.ativo ? "ativo" : "inativo"}</Badge>],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium text-right">{v}</dd>
              </div>
            ))}
            {empresa.observacoes && (
              <div>
                <dt className="text-muted">Observações</dt>
                <dd className="mt-1 whitespace-pre-wrap">{empresa.observacoes}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Empreendimentos"
            actions={
              <Link href={`/empreendimentos/novo?empresaId=${empresa.id}`}>
                <Button>+ Empreendimento</Button>
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {empreendimentos.map((e) => (
              <li key={e.id}>
                <Link href={`/empreendimentos/${e.id}`} className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-900">{e.nome}</p>
                    <p className="text-xs text-muted">
                      {e.municipio && e.uf ? `${e.municipio}/${e.uf}` : labelTipoEmpreendimento(e.tipo)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted">
                    {e._count.processos} {e._count.processos === 1 ? "processo" : "processos"}
                    <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
            {empreendimentos.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">
                Nenhum empreendimento vinculado a esta empresa.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader title="Contatos" />
          <ul className="divide-y divide-slate-100">
            {empresa.contatos.map((c) => (
              <li key={c.id} className="grid grid-cols-1 gap-1 px-5 py-3 text-sm sm:grid-cols-4 sm:gap-4">
                <span className="font-medium text-navy-900">{c.nome || "—"}</span>
                <span className="text-muted">{c.email || "—"}</span>
                <span className="text-muted">{c.telefone || "—"}</span>
                <span className="text-muted">{c.assunto || "—"}</span>
              </li>
            ))}
            {empresa.contatos.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">
                Nenhum contato cadastrado.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
