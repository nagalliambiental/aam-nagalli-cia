import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  addReportPage,
  createReportDocument,
  drawReportChrome,
  drawReportTableHeader,
  drawReportTableRow,
  REPORT_PAGE,
} from "@/lib/relatorio-pdf";
import type { RelatorioGerencial } from "@/lib/relatorios-gerenciais";

export async function relatorioPdfResponse(relatorio: RelatorioGerencial, filename: string) {
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
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=${filename}.pdf` },
  });
}

export async function relatorioXlsxResponse(relatorio: RelatorioGerencial, filename: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AAM Nagalli & Cia";
  const worksheet = workbook.addWorksheet(relatorio.titulo);
  worksheet.columns = relatorio.colunas.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.max(18, Math.min(48, column.label.length + 12)),
  }));
  relatorio.linhas.forEach((linha) => worksheet.addRow(Object.fromEntries(linha.map((value, index) => [`coluna${index}`, value]))));
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  header.alignment = { vertical: "middle", wrapText: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: { row: 1, column: relatorio.colunas.length } };
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}.xlsx`,
    },
  });
}
