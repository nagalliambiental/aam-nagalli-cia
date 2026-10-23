import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Search, CheckCircle2, Clock } from "lucide-react";
import { PrazoStatusButton } from "@/components/processos/PrazoStatusButton";
import { PrazoAlertaEdit } from "@/components/processos/PrazoAlertaEdit";
import { filtroSegregacao, filtroProcesso, filtroPorProcesso } from "@/lib/segregacao";
import { BuscaAuto } from "@/components/ui/BuscaAuto";
import { Paginacao } from "@/components/ui/Paginacao";

type SearchParams = Promise<{ q?: string | string[]; status?: string | string[]; pagina?: string | string[] }>;

const POR_PAGINA = 20;

export default async function PrazosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const verConcluidos = typeof sp.status === "string" && sp.status === "concluido";
  const pagina = Math.max(1, Number(typeof sp.pagina === "string" ? sp.pagina : 1) || 1);
  const { scoped, responsavelPessoaId } = await filtroSegregacao();

  const statusFilter = verConcluidos
    ? { status: "concluido" as const }
    : { status: { notIn: ["concluido", "cancelado"] as string[] } };

  const filtroPrazos = {
    ativo: true,
    deletedAt: null,
    processo: { ativo: true, deletedAt: null, ...filtroProcesso(scoped, responsavelPessoaId) },
    ...statusFilter,
    ...(q ? { descricao: { contains: q, mode: "insensitive" as const } } : {}),
  } as const;

  const [prazos, totalPrazos] = await Promise.all([
    prisma.prazo.findMany({
      where: filtroPrazos,
      orderBy: { dataCalculadaAtual: "asc" },
      include: {
        processo: { include: { orgao: true } },
      },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.prazo.count({ where: filtroPrazos }),
  ]);

  const construirPagina = (p: number) => {
    const params = new URLSearchParams();
    if (verConcluidos) params.set("status", "concluido");
    if (q) params.set("q", q);
    params.set("pagina", String(p));
    return `/prazos?${params.toString()}`;
  };

  const exportParams = new URLSearchParams();
  if (verConcluidos) exportParams.set("status", "concluido");
  if (q) exportParams.set("q", q);
  const exportQuery = exportParams.toString() ? `?${exportParams.toString()}` : "";

  return (
    <div>
      <PageHeader
        title="Prazos"
        subtitle="Prazos calculados por processo e status"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/prazos/exportar${exportQuery}${exportQuery ? "&" : "?"}formato=pdf`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar PDF</Button>
            </a>
            <a href={`/api/prazos/exportar${exportQuery}${exportQuery ? "&" : "?"}formato=xlsx`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Exportar XLSX</Button>
            </a>
          </div>
        }
      />

      <Card>
        <BuscaAuto placeholder="Buscar por descrição..." valorInicial={q} />
        <div className="flex items-center gap-2 border-b border-slate-200 p-4">
          <Link
            href="/prazos"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${!verConcluidos ? "bg-navy-100 text-navy-800" : "text-muted hover:bg-slate-100"}`}
          >
            <Clock className="h-3.5 w-3.5" /> A cumprir
          </Link>
          <Link
            href="/prazos?status=concluido"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${verConcluidos ? "bg-emerald-50 text-emerald-800" : "text-muted hover:bg-slate-100"}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Concluídos
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {prazos.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-navy-900">{p.descricao}</p>
                  <p className="text-xs text-muted">
                    {p.processo ? (
                      <>
                        {" "}processo # <span className="text-navy-700">{p.processo.numero}</span> ·{" "}
                        {p.processo.orgao.sigla}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.dataCalculadaAtual && (
                    <span className="text-xs text-muted">
                      até {formatDate(p.dataCalculadaAtual)}
                    </span>
                  )}
                  <PrazoStatusButton processoId={p.processoId} prazoId={p.id} status={p.status} />
                  <PrazoAlertaEdit processoId={p.processoId} prazoId={p.id} alertaDias={p.alertaDias} />
                </div>
              </div>
            </li>
          ))}
          {prazos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              {verConcluidos ? "Nenhum prazo concluído." : "Nenhum prazo a cumprir."}
            </li>
          )}
        </ul>
        <Paginacao pagina={pagina} total={totalPrazos} porPagina={POR_PAGINA} construirHref={construirPagina} />
      </Card>
    </div>
  );
}
