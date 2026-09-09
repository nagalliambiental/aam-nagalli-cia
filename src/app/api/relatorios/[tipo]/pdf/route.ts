import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addReportPage, createReportDocument, drawReportChrome, drawReportTableHeader, drawReportTableRow, REPORT_PAGE } from "@/lib/relatorio-pdf";
import { buscarRelatorioGerencial, RelatorioGerencialTipo } from "@/lib/relatorios-gerenciais";

type Ctx = { params: Promise<{ tipo: string }> };
const TIPOS = new Set<RelatorioGerencialTipo>(["processos", "prazos", "tarefas", "exigencias", "condicionantes"]);

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { tipo } = await params;
  if (!TIPOS.has(tipo as RelatorioGerencialTipo)) return NextResponse.json({ error: "Relatório inválido" }, { status: 404 });
  const relatorio = await buscarRelatorioGerencial(tipo as RelatorioGerencialTipo);
  const { doc, fonts } = await createReportDocument();
  const columns = relatorio.colunas.map((column) => ({ label: column.label, w: 515 / relatorio.colunas.length }));
  let page = addReportPage(doc);
  let pageNumber = 1;
  drawReportChrome(page, fonts, relatorio.titulo, relatorio.linhas.length, pageNumber);
  let y = drawReportTableHeader(page, fonts, 690, columns);
  for (let index = 0; index < relatorio.linhas.length; index++) {
    if (y - 24 < REPORT_PAGE.bottom) {
      page = addReportPage(doc);
      pageNumber += 1;
      drawReportChrome(page, fonts, relatorio.titulo, relatorio.linhas.length, pageNumber);
      y = drawReportTableHeader(page, fonts, 690, columns);
    }
    y = drawReportTableRow(page, fonts, y, columns, relatorio.linhas[index], index);
  }
  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=${tipo}.pdf` } });
}
