import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { buscarRelatorioGerencial, RelatorioGerencialTipo } from "@/lib/relatorios-gerenciais";
import { requirePermissao } from "@/lib/perfil";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = new Set<RelatorioGerencialTipo>([
  "clientes",
  "empreendimentos",
  "processos-minerarios",
  "processos-ambientais",
  "prazos",
]);

const FILTRO_STATUS_MINERARIO = [
  { value: "", label: "Todos os status" },
  { value: "ativo", label: "Ativo" },
  { value: "paralisado", label: "Paralisado" },
  { value: "morto", label: "Morto" },
];

const FILTRO_STATUS_AMBIENTAL = [
  { value: "", label: "Todos os status" },
  { value: "ativo", label: "Ativo" },
  { value: "proximo_vencimento", label: "Próximo do Vencimento" },
  { value: "em_renovacao", label: "Em Renovação" },
  { value: "encerrado", label: "Encerrado" },
  { value: "morto", label: "Morto" },
];

const FILTRO_PRAZO_DIAS = [
  { value: "todos", label: "Todos os prazos" },
  { value: "vencidos", label: "Vencidos" },
  { value: "15", label: "Próximos 15 dias" },
  { value: "30", label: "Próximos 30 dias" },
  { value: "60", label: "Próximos 60 dias" },
  { value: "90", label: "Próximos 90 dias" },
];

type SearchParams = Promise<{ status?: string | string[]; dias?: string | string[] }>;

function queryAtual(tipo: string, status: string, dias: string) {
  const params = new URLSearchParams();
  if (status && (tipo === "processos-minerarios" || tipo === "processos-ambientais")) params.set("status", status);
  if (dias && tipo === "prazos") params.set("dias", dias);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export default async function RelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ tipo: string }>;
  searchParams: SearchParams;
}) {
  await requirePermissao("relatorio:ler");
  const { tipo } = await params;
  if (!TIPOS_VALIDOS.has(tipo as RelatorioGerencialTipo)) notFound();
  const tipoValido = tipo as RelatorioGerencialTipo;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const dias = typeof sp.dias === "string" ? sp.dias : "todos";
  const relatorio = await buscarRelatorioGerencial(tipoValido, { status, dias });
  const paramsAtual = queryAtual(tipo, status, dias);
  return (
    <div>
      <PageHeader
        title={`Relatório: ${relatorio.titulo}`}
        subtitle="Aplique os filtros e baixe o PDF/XLSX com os dados filtrados"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/relatorios/${tipo}/pdf${paramsAtual}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Baixar PDF</Button>
            </a>
            <a href={`/api/relatorios/${tipo}/xlsx${paramsAtual}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Baixar XLSX</Button>
            </a>
            <Link href="/relatorios">
              <Button variant="ghost">← Voltar</Button>
            </Link>
          </div>
        }
      />
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          {(tipo === "processos-minerarios" || tipo === "processos-ambientais") && (
            <div>
              <label htmlFor="rel-status" className="mb-1 block text-xs font-medium text-slate-700">Status</label>
              <select id="rel-status" name="status" defaultValue={status} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                {(tipo === "processos-minerarios" ? FILTRO_STATUS_MINERARIO : FILTRO_STATUS_AMBIENTAL).map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
          )}
          {tipo === "prazos" && (
            <div>
              <label htmlFor="rel-dias" className="mb-1 block text-xs font-medium text-slate-700">Prazo</label>
              <select id="rel-dias" name="dias" defaultValue={dias} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                {FILTRO_PRAZO_DIAS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
          )}
          <Button type="submit" variant="secondary">Aplicar filtros</Button>
          <span className="ml-auto"><Badge tone="gray">{relatorio.linhas.length} registro(s)</Badge></span>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-700">
            <thead>
              <tr>
                {relatorio.colunas.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-semibold text-navy-900 border-b border-slate-200 bg-slate-50">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {relatorio.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((valor, j) => (
                    <td key={j} className="px-4 py-3 border-b border-slate-100">{valor}</td>
                  ))}
                </tr>
              ))}
              {relatorio.linhas.length === 0 && (
                <tr>
                  <td colSpan={relatorio.colunas.length} className="px-4 py-10 text-center text-muted">Nenhum registro com os filtros atuais.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
