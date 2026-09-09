import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatCNPJ, formatDate, formatDateTime, formatMoney } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };
const W = 595.28;
const H = 841.89;
const M = 32;
const NAVY = rgb(0.01, 0.12, 0.3);
const BLUE = rgb(0.04, 0.42, 0.65);
const GOLD = rgb(0.96, 0.61, 0.05);
const INK = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.36, 0.42, 0.49);
const LINE = rgb(0.84, 0.87, 0.91);
const SOFT = rgb(0.96, 0.97, 0.98);

function text(value: unknown) {
  return value == null ? "—" : String(value);
}

function cut(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function header(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, fatura: { numero: string; ano: number; status: string; empresa: { razaoSocial: string; nomeFantasia: string | null; cnpj: string | null }; recebidoEm: Date | null }, pageNumber: number) {
  page.drawRectangle({ x: 0, y: H - 82, width: W, height: 82, color: NAVY });
  page.drawRectangle({ x: M, y: H - 62, width: 42, height: 42, color: GOLD });
  page.drawText("AAM", { x: M + 4, y: H - 45, size: 12, font: fonts.bold, color: NAVY });
  page.drawText("NAGALLI & CIA", { x: M + 56, y: H - 36, size: 17, font: fonts.bold, color: rgb(1, 1, 1) });
  page.drawText("GESTÃO AMBIENTAL E MINERÁRIA", { x: M + 57, y: H - 54, size: 7.5, font: fonts.regular, color: rgb(0.76, 0.84, 0.92) });
  page.drawText("FATURA", { x: W - 94, y: H - 35, size: 9, font: fonts.bold, color: GOLD });
  page.drawText(`${fatura.numero}/${fatura.ano}`, { x: W - 94, y: H - 54, size: 14, font: fonts.bold, color: rgb(1, 1, 1) });

  page.drawText(fatura.empresa.nomeFantasia || fatura.empresa.razaoSocial, { x: M, y: H - 108, size: 12, font: fonts.bold, color: NAVY });
  page.drawText(`CNPJ: ${formatCNPJ(fatura.empresa.cnpj)}`, { x: M, y: H - 124, size: 8.5, font: fonts.regular, color: MUTED });
  page.drawText(`Status: ${fatura.status === "paga" || fatura.recebidoEm ? "PAGA" : fatura.status.toUpperCase()}`, { x: W - 150, y: H - 108, size: 9, font: fonts.bold, color: fatura.status === "paga" || fatura.recebidoEm ? rgb(0.05, 0.45, 0.25) : BLUE });
  if (fatura.recebidoEm) page.drawText(`Recebida em ${formatDateTime(fatura.recebidoEm)}`, { x: W - 150, y: H - 124, size: 8, font: fonts.regular, color: MUTED });
  page.drawLine({ start: { x: M, y: 35 }, end: { x: W - M, y: 35 }, thickness: 0.6, color: LINE });
  page.drawText("AAM Nagalli & Cia LTDA · Uso interno", { x: M, y: 20, size: 7.5, font: fonts.regular, color: MUTED });
  page.drawText(`Página ${pageNumber}`, { x: W - M - 43, y: 20, size: 7.5, font: fonts.bold, color: MUTED });
}

function tableHeader(page: PDFPage, fonts: { bold: PDFFont }, y: number, columns: { w: number; label: string }[]) {
  let x = M;
  for (const column of columns) {
    page.drawRectangle({ x, y: y - 22, width: column.w, height: 22, color: BLUE });
    page.drawText(column.label, { x: x + 5, y: y - 14, size: 7.5, font: fonts.bold, color: rgb(1, 1, 1) });
    x += column.w;
  }
  return y - 22;
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  const fatura = await prisma.fatura.findFirst({
    where: { id: Number(id), ativo: true, deletedAt: null },
    include: { empresa: true, empreendimento: true, itens: { orderBy: { id: "asc" } } },
  });
  if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });

  const doc = await PDFDocument.create();
  const fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  const columns = [
    { w: 45, label: "Data" }, { w: 130, label: "Identificação" }, { w: 250, label: "Descrição" }, { w: 75, label: "Total" },
  ];
  const detailColumns = [
    { w: 90, label: "Qtde" }, { w: 115, label: "Hora técnica" }, { w: 90, label: "Desconto" }, { w: 115, label: "Outros custos" }, { w: 90, label: "Adm/Fiscais" },
  ];
  const tableWidth = columns.reduce((sum, column) => sum + column.w, 0);
  const total = fatura.itens.reduce((sum, item) => sum + Number(item.total), 0);
  let pageNumber = 1;
  let page = doc.addPage([W, H]);
  header(page, fonts, fatura, pageNumber);
  page.drawText(`Referência: ${cut(fatura.referencia || fatura.empreendimento?.apelido || fatura.empreendimento?.nome || "—", 48)}`, { x: M, y: H - 148, size: 8.5, font: fonts.regular, color: INK });
  page.drawText(`Período: ${cut(fatura.periodo || "—", 30)}`, { x: M, y: H - 164, size: 8.5, font: fonts.regular, color: INK });
  page.drawText(`Vencimento: ${formatDate(fatura.vencimento)}`, { x: W - M - 145, y: H - 148, size: 8.5, font: fonts.bold, color: INK });
  let y = tableHeader(page, fonts, H - 182, columns);
  for (let index = 0; index < fatura.itens.length; index++) {
    if (y - 39 < 72) {
      page = doc.addPage([W, H]);
      pageNumber += 1;
      header(page, fonts, fatura, pageNumber);
      y = tableHeader(page, fonts, H - 112, columns);
    }
    const item = fatura.itens[index];
    const values = [formatDate(item.data), cut(item.identificacao, 27), cut(item.descricao || "—", 49), formatMoney(item.total)];
    let x = M;
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      page.drawRectangle({ x, y: y - 22, width: column.w, height: 22, color: index % 2 === 0 ? rgb(1, 1, 1) : SOFT });
      page.drawText(values[i], { x: x + 5, y: y - 14, size: 8, font: i === columns.length - 1 ? fonts.bold : fonts.regular, color: INK });
      x += column.w;
    }
    y -= 22;
    const detailValues = [text(Number(item.qtde)), formatMoney(item.horaTecnica), item.descontoPct == null ? "—" : `${Number(item.descontoPct)}% (${formatMoney(item.descontoValor)})`, formatMoney(item.outrosCustos), formatMoney(item.custosAdmFiscais)];
    x = M;
    for (let i = 0; i < detailColumns.length; i++) {
      const column = detailColumns[i];
      page.drawRectangle({ x, y: y - 17, width: column.w, height: 17, color: index % 2 === 0 ? rgb(0.98, 0.99, 1) : rgb(0.93, 0.95, 0.97) });
      page.drawText(`${column.label}: ${detailValues[i]}`, { x: x + 5, y: y - 11, size: 6.8, font: fonts.regular, color: MUTED });
      x += column.w;
    }
    page.drawLine({ start: { x: M, y: y - 17 }, end: { x: M + tableWidth, y: y - 17 }, thickness: 0.3, color: LINE });
    y -= 17;
  }
  y -= 12;
  if (y - 105 < 55) {
    page = doc.addPage([W, H]);
    pageNumber += 1;
    header(page, fonts, fatura, pageNumber);
    y = H - 112;
  }
  page.drawRectangle({ x: W - M - 205, y: y - 35, width: 205, height: 35, color: NAVY });
  page.drawText("TOTAL GERAL", { x: W - M - 195, y: y - 22, size: 9, font: fonts.bold, color: rgb(1, 1, 1) });
  page.drawText(formatMoney(total), { x: W - M - 92, y: y - 22, size: 11, font: fonts.bold, color: GOLD });
  page.drawText("Pagamento", { x: M, y: y - 58, size: 8, font: fonts.bold, color: NAVY });
  page.drawText("PIX CNPJ 02.836.099/0001-91 · Banco do Brasil 001 · Agência 4500-4 · Conta Corrente 27.366-0", { x: M, y: y - 72, size: 7.5, font: fonts.regular, color: MUTED });
  if (fatura.observacoes) page.drawText(`Observações: ${cut(fatura.observacoes, 115)}`, { x: M, y: y - 88, size: 7.5, font: fonts.regular, color: MUTED });

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=fatura-${fatura.numero}-${fatura.ano}.pdf` } });
}
