import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, CardHeader, Button, EmptyState } from "@/components/ui";

const REPORTS = [
  {
    tipo: "processos",
    titulo: "Processos",
    descricao: "Relatório completo de processos minerários e ambientais cadastrados.",
  },
  {
    tipo: "prazos",
    titulo: "Prazos",
    descricao: "Todos os prazos registrados, com status e datas calculadas.",
  },
  {
    tipo: "tarefas",
    titulo: "Atividades",
    descricao: "Tarefas e atividades vinculadas a processos, prazos e exigências.",
  },
  {
    tipo: "exigencias",
    titulo: "Pendências",
    descricao: "Exigências recebidas de órgãos, com prazo de resposta.",
  },
  {
    tipo: "condicionantes",
    titulo: "Condicionantes",
    descricao: "Condicionantes de licenças ambientais com vencimentos e status.",
  },
] as const;

type ReportSlug = (typeof REPORTS)[number]["tipo"];

const TABLE_CLASSES =
  "w-full text-sm text-left text-slate-700";
const TH_CLASSES =
  "px-4 py-3 font-semibold text-navy-900 border-b border-slate-200 bg-slate-50";
const TD_CLASSES =
  "px-4 py-3 border-b border-slate-100";

async function renderReportTable(tipo: ReportSlug) {
  switch (tipo) {
    case "processos": {
      const data = await prisma.processo.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { dataAbertura: "desc" },
        include: { orgao: true, tipoProcesso: true, empreendimento: true },
      });
      return (
        <Card>
          <div className="overflow-x-auto">
            <table className={TABLE_CLASSES}>
              <thead>
                <tr>
                  <th className={TH_CLASSES}>Nº</th>
                  <th className={TH_CLASSES}>Órgão</th>
                  <th className={TH_CLASSES}>Tipo</th>
                  <th className={TH_CLASSES}>Status</th>
                  <th className={TH_CLASSES}>Abertura</th>
                  <th className={TH_CLASSES}>Empreendimento</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className={TD_CLASSES}>{p.numero}</td>
                    <td className={TD_CLASSES}>{p.orgao.sigla}</td>
                    <td className={TD_CLASSES}>{p.tipoProcesso.nome}</td>
                    <td className={TD_CLASSES}>{p.status}</td>
                    <td className={TD_CLASSES}>{formatDate(p.dataAbertura)}</td>
                    <td className={TD_CLASSES}>{p.empreendimento?.nome ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length === 0 && <EmptyState title="Nenhum processo encontrado." />}
        </Card>
      );
    }

    case "prazos": {
      const data = await prisma.prazo.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { dataCalculadaAtual: "asc" },
        include: { processo: true },
      });
      return (
        <Card>
          <div className="overflow-x-auto">
            <table className={TABLE_CLASSES}>
              <thead>
                <tr>
                  <th className={TH_CLASSES}>Descrição</th>
                  <th className={TH_CLASSES}>Processo</th>
                  <th className={TH_CLASSES}>Status</th>
                  <th className={TH_CLASSES}>Data Calculada</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className={TD_CLASSES}>{p.descricao}</td>
                    <td className={TD_CLASSES}>{p.processo?.numero ?? "—"}</td>
                    <td className={TD_CLASSES}>{p.status}</td>
                    <td className={TD_CLASSES}>{formatDate(p.dataCalculadaAtual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length === 0 && <EmptyState title="Nenhum prazo encontrado." />}
        </Card>
      );
    }

    case "tarefas": {
      const data = await prisma.tarefa.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { prazoData: "asc" },
        include: { responsavel: true, processo: true },
      });
      return (
        <Card>
          <div className="overflow-x-auto">
            <table className={TABLE_CLASSES}>
              <thead>
                <tr>
                  <th className={TH_CLASSES}>Título</th>
                  <th className={TH_CLASSES}>Status</th>
                  <th className={TH_CLASSES}>Prazo</th>
                  <th className={TH_CLASSES}>Responsável</th>
                  <th className={TH_CLASSES}>Processo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id}>
                    <td className={TD_CLASSES}>{t.titulo}</td>
                    <td className={TD_CLASSES}>{t.status}</td>
                    <td className={TD_CLASSES}>{formatDate(t.prazoData)}</td>
                    <td className={TD_CLASSES}>{t.responsavel?.nome ?? "—"}</td>
                    <td className={TD_CLASSES}>{t.processo?.numero ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length === 0 && <EmptyState title="Nenhuma tarefa encontrada." />}
        </Card>
      );
    }

    case "exigencias": {
      const data = await prisma.exigencia.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { dataRecebimento: "desc" },
        include: { processo: true, orgao: true },
      });
      return (
        <Card>
          <div className="overflow-x-auto">
            <table className={TABLE_CLASSES}>
              <thead>
                <tr>
                  <th className={TH_CLASSES}>Descrição</th>
                  <th className={TH_CLASSES}>Status</th>
                  <th className={TH_CLASSES}>Prazo Resposta</th>
                  <th className={TH_CLASSES}>Órgão</th>
                  <th className={TH_CLASSES}>Processo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.id}>
                    <td className={TD_CLASSES}>{e.descricao}</td>
                    <td className={TD_CLASSES}>{e.status}</td>
                    <td className={TD_CLASSES}>{formatDate(e.prazoResposta)}</td>
                    <td className={TD_CLASSES}>{e.orgao.sigla}</td>
                    <td className={TD_CLASSES}>{e.processo.numero}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length === 0 && <EmptyState title="Nenhuma exigência encontrada." />}
        </Card>
      );
    }

    case "condicionantes": {
      const data = await prisma.condicionante.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { proximoVencimento: "asc" },
        include: { licenca: true },
      });
      return (
        <Card>
          <div className="overflow-x-auto">
            <table className={TABLE_CLASSES}>
              <thead>
                <tr>
                  <th className={TH_CLASSES}>Código</th>
                  <th className={TH_CLASSES}>Descrição</th>
                  <th className={TH_CLASSES}>Status</th>
                  <th className={TH_CLASSES}>Próximo Vencimento</th>
                  <th className={TH_CLASSES}>Licença</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td className={TD_CLASSES}>{c.codigo ?? "—"}</td>
                    <td className={TD_CLASSES}>{c.descricao}</td>
                    <td className={TD_CLASSES}>{c.status}</td>
                    <td className={TD_CLASSES}>{formatDate(c.proximoVencimento)}</td>
                    <td className={TD_CLASSES}>{c.licenca?.numero ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length === 0 && <EmptyState title="Nenhuma condicionante encontrada." />}
        </Card>
      );
    }
  }
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  await requirePermissao("relatorio:ler");

  const params = await searchParams;
  const tipo = params.tipo as ReportSlug | undefined;

  if (tipo && REPORTS.some((r) => r.tipo === tipo)) {
    const report = REPORTS.find((r) => r.tipo === tipo)!;
    const table = await renderReportTable(tipo);

    return (
      <div>
        <PageHeader
          title={`Relatório: ${report.titulo}`}
          subtitle={report.descricao}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => window.print()}>
                Imprimir
              </Button>
              <Link href="/relatorios">
                <Button variant="ghost">← Voltar</Button>
              </Link>
            </div>
          }
        />
        {table}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Relatórios gerenciais disponíveis" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.tipo} className="flex flex-col p-5">
            <h3 className="text-base font-semibold text-navy-900">{r.titulo}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{r.descricao}</p>
            <div className="mt-4">
              <Link href={`/relatorios?tipo=${r.tipo}`}>
                <Button variant="secondary">Ver</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
