import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button, Badge } from "@/components/ui";
import { Tabs } from "@/components/ui/Tabs";
import { formatDate } from "@/lib/format";
import { CondicionantesPanel } from "@/components/processos/CondicionantesPanel";

export default async function LicencaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const licencaId = Number(id);
  await requirePermissao("cadastro:ler");

  const licenca = await prisma.licenca.findFirst({
    where: { id: licencaId, ativo: true, deletedAt: null },
    include: {
      tipoLicenca: true,
      orgao: true,
      empreendimento: true,
      responsavel: true,
      condicionantes: {
        where: { ativo: true, deletedAt: null },
        orderBy: [{ status: "asc" }, { proximoVencimento: "asc" }],
        include: { responsavel: true },
      },
      processos: { include: { processo: { include: { orgao: true } } } },
      _count: { select: { prazos: true, tarefas: true } },
    },
  });
  if (!licenca) notFound();

  const dados = (
    <Card>
      <CardHeader title="Dados gerais" />
      <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
        {[
          ["Tipo", licenca.tipoLicenca.nome],
          ["Órgão", `${licenca.orgao.sigla} — ${licenca.orgao.nome}`],
          ["Empreendimento", licenca.empreendimento ? (licenca.empreendimento.apelido || licenca.empreendimento.nome) : "—"],
          ["Emissão", licenca.dataEmissao ? formatDate(licenca.dataEmissao) : "—"],
          ["Validade", licenca.dataValidade ? formatDate(licenca.dataValidade) : "—"],
          ["Responsável", licenca.responsavel?.nome ?? "—"],
          ["Situação", <Badge key="s" tone={licenca.situacao === "ativa" ? "green" : "amber"}>{licenca.situacao}</Badge>],
        ].map(([k, v]) => (
          <div key={k as string}>
            <dt className="text-muted">{k}</dt>
            <dd className="mt-0.5 font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {licenca.observacoes && (
        <div className="border-t border-slate-200 px-5 py-4 text-sm">
          <dt className="text-muted">Observações</dt>
          <dd className="mt-1 whitespace-pre-wrap">{licenca.observacoes}</dd>
        </div>
      )}
      {licenca.processos.length > 0 && (
        <div className="border-t border-slate-200 px-5 py-4 text-sm">
          <h3 className="mb-2 font-semibold text-navy-900">Processos vinculados</h3>
          <ul className="space-y-1">
            {licenca.processos.map((x) => (
              <li key={x.id}>
                <Link href={`/processos/${x.processo.id}`} className="text-navy-700 underline">
                  #{x.processo.numero} ({x.processo.orgao.sigla})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );

  return (
    <div>
      <PageHeader
        title={`Licença ${licenca.numero}`}
        subtitle={`${licenca.tipoLicenca.nome} · ${licenca.orgao.sigla}`}
        actions={
          <>
            <Link href="/licencas">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/licencas/${licenca.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: "dados", label: "Dados gerais" },
          { id: "condicionantes", label: "Condicionantes", count: licenca.condicionantes.length },
        ]}
        defaultId="dados"
      >
        {dados}
        <CondicionantesPanel licencaId={licenca.id} condicionantes={licenca.condicionantes} />
      </Tabs>
    </div>
  );
}
