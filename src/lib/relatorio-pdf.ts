import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

export const REPORT_PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 40,
  bottom: 58,
};

export const REPORT_COLORS = {
  navy: rgb(0.01, 0.12, 0.3),
  blue: rgb(0.04, 0.42, 0.65),
  gold: rgb(0.96, 0.61, 0.05),
  ink: rgb(0.12, 0.16, 0.22),
  muted: rgb(0.36, 0.42, 0.49),
  line: rgb(0.84, 0.87, 0.91),
  soft: rgb(0.96, 0.97, 0.98),
  white: rgb(1, 1, 1),
};

export type ReportFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

export type ReportColumn = {
  w: number;
  label: string;
};

export async function createReportDocument() {
  const doc = await PDFDocument.create();
  const fonts: ReportFonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  return { doc, fonts };
}

export function addReportPage(doc: PDFDocument) {
  return doc.addPage([REPORT_PAGE.width, REPORT_PAGE.height]);
}

export function drawReportChrome(
  page: PDFPage,
  fonts: ReportFonts,
  title: string,
  count: number,
  pageNumber: number,
) {
  const { margin, width, height } = REPORT_PAGE;
  const right = width - margin;
  const today = new Date().toLocaleDateString("pt-BR");

  page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: REPORT_COLORS.navy });
  page.drawRectangle({ x: margin, y: height - 68, width: 42, height: 42, color: REPORT_COLORS.gold });
  page.drawText("AAM", { x: margin + 4, y: height - 51, size: 12, font: fonts.bold, color: REPORT_COLORS.navy });
  page.drawText("NAGALLI & CIA", { x: margin + 56, y: height - 42, size: 17, font: fonts.bold, color: REPORT_COLORS.white });
  page.drawText("GESTÃO AMBIENTAL E MINERÁRIA", { x: margin + 57, y: height - 60, size: 7.5, font: fonts.regular, color: rgb(0.76, 0.84, 0.92) });
  page.drawText("RELATÓRIO GERENCIAL", { x: right - 128, y: height - 39, size: 7, font: fonts.bold, color: REPORT_COLORS.gold });
  page.drawText(today, { x: right - 72, y: height - 57, size: 8, font: fonts.regular, color: rgb(0.76, 0.84, 0.92) });

  page.drawText(title, { x: margin, y: height - 126, size: 20, font: fonts.bold, color: REPORT_COLORS.navy });
  page.drawText(`${count} registro(s) ativo(s)`, { x: margin, y: height - 143, size: 9, font: fonts.regular, color: REPORT_COLORS.muted });
  page.drawRectangle({ x: margin, y: height - 158, width: 42, height: 3, color: REPORT_COLORS.gold });

  page.drawLine({ start: { x: margin, y: 42 }, end: { x: right, y: 42 }, thickness: 0.6, color: REPORT_COLORS.line });
  page.drawText("AAM Nagalli & Cia LTDA", { x: margin, y: 27, size: 7.5, font: fonts.bold, color: REPORT_COLORS.muted });
  page.drawText("Uso interno · Documento gerado pelo sistema", { x: margin + 108, y: 27, size: 7.5, font: fonts.regular, color: REPORT_COLORS.muted });
  page.drawText(`Página ${pageNumber}`, { x: right - 43, y: 27, size: 7.5, font: fonts.bold, color: REPORT_COLORS.muted });
}

export function drawReportTableHeader(page: PDFPage, fonts: ReportFonts, y: number, columns: ReportColumn[]) {
  let x = REPORT_PAGE.margin;
  const height = 25;
  for (const column of columns) {
    page.drawRectangle({ x, y: y - height, width: column.w, height, color: REPORT_COLORS.blue });
    page.drawText(column.label.toUpperCase(), {
      x: x + 7,
      y: y - 16,
      size: 7.5,
      font: fonts.bold,
      color: REPORT_COLORS.white,
    });
    x += column.w;
  }
  return y - height;
}

export function drawReportTableRow(
  page: PDFPage,
  fonts: ReportFonts,
  y: number,
  columns: ReportColumn[],
  values: string[],
  index: number,
) {
  const height = 24;
  const background = index % 2 === 0 ? REPORT_COLORS.white : REPORT_COLORS.soft;
  let x = REPORT_PAGE.margin;
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    page.drawRectangle({ x, y: y - height, width: column.w, height, color: background });
    page.drawText(truncate(values[i] ?? "", Math.max(8, Math.floor(column.w / 5.4))), {
      x: x + 7,
      y: y - 16,
      size: 8.5,
      font: fonts.regular,
      color: REPORT_COLORS.ink,
    });
    x += column.w;
  }
  page.drawLine({ start: { x: REPORT_PAGE.margin, y: y - height }, end: { x: x, y: y - height }, thickness: 0.35, color: REPORT_COLORS.line });
  return y - height;
}

export function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
