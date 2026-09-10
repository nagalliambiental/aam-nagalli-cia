import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatDocumento, formatDate, formatDateTime, formatMoney } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };
type Fonts = { regular: PDFFont; bold: PDFFont };
type Column = { w: number; label: string };

const W = 841.89;
const H = 595.28;
const M = 34;
const CONTENT_W = W - M * 2;
const NAVY = rgb(0.01, 0.12, 0.3);
const BLUE = rgb(0.04, 0.42, 0.65);
const INK = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.36, 0.42, 0.49);
const LINE = rgb(0.78, 0.82, 0.88);
const SOFT = rgb(0.96, 0.97, 0.98);

const COLUMNS: Column[] = [
  { w: 55, label: "DATA" }, { w: 98, label: "IDENTIFICAÇÃO" }, { w: 190, label: "DESCRIÇÃO" },
  { w: 42, label: "QTDE" }, { w: 75, label: "HORA TÉC. (R$)" }, { w: 48, label: "DESC. (%)" },
  { w: 70, label: "DESC. VALOR" }, { w: 70, label: "OUTROS (R$)" }, { w: 70, label: "ADM/FISC. (R$)" }, { w: 52, label: "TOTAL (R$)" },
];

function money(value: unknown) { return formatMoney(Number(value)); }

function wrap(value: string, font: PDFFont, size: number, maxWidth: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["—"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current && font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const character of word) {
        const next = `${chunk}${character}`;
        if (chunk && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(chunk); chunk = character; } else chunk = next;
      }
      current = chunk;
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(current); current = word; } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function drawHeader(page: PDFPage, fonts: Fonts, logo: PDFImage, fatura: { numero: string; ano: number; status: string; empresa: { razaoSocial: string; nomeFantasia: string | null; cnpj: string | null; cpf?: string | null; tipoPessoa?: string | null }; recebidoEm: Date | null }, pageNumber: number) {
  page.drawRectangle({ x: 0, y: H - 82, width: W, height: 82, color: NAVY });
  page.drawImage(logo, { x: M + 4, y: H - 72, width: 128, height: 69 });
  page.drawText(`FATURA Nº ${fatura.numero} / ${fatura.ano}`, { x: W - M - 205, y: H - 45, size: 16, font: fonts.bold, color: rgb(1, 1, 1) });
  page.drawText("AAM Nagalli & Cia LTDA", { x: M, y: H - 99, size: 9, font: fonts.bold, color: NAVY });
  page.drawText(`Página ${pageNumber}`, { x: W - M - 43, y: 20, size: 7.5, font: fonts.bold, color: MUTED });
  page.drawLine({ start: { x: M, y: 34 }, end: { x: W - M, y: 34 }, thickness: 0.6, color: LINE });
  page.drawText("AAM Nagalli & Cia LTDA · Documento gerado pelo sistema", { x: M, y: 20, size: 7.5, font: fonts.regular, color: MUTED });
}

function drawInfoGrid(page: PDFPage, fonts: Fonts, fatura: { empresa: { razaoSocial: string; cnpj: string | null; cpf?: string | null; tipoPessoa?: string | null }; referencia: string | null; periodo: string | null; vencimento: Date | null }) {
  const half = CONTENT_W / 2;
  const docLabel = fatura.empresa.tipoPessoa === "fisica" ? "CPF" : "CNPJ";
  const rows = [
    ["CLIENTE", fatura.empresa.razaoSocial], [docLabel, formatDocumento(fatura.empresa)], ["REFERÊNCIA", fatura.referencia || "—"],
    ["PERÍODO / VENCIMENTO", `${fatura.periodo || "—"} · Venc.: ${formatDate(fatura.vencimento)}`],
    ["PAGAMENTO", "Nagalli & Cia LTDA.\nChave PIX: CNPJ 02.836.099/0001-91\nBanco do Brasil: 001; Agência 4500-4; Conta Corrente 27.366-0"],
  ];
  let y = H - 116;
  rows.forEach(([label, value], index) => {
    const height = index === rows.length - 1 ? 43 : 22;
    page.drawRectangle({ x: M, y: y - height, width: half, height, color: SOFT, borderColor: LINE, borderWidth: 0.45 });
    page.drawRectangle({ x: M + half, y: y - height, width: half, height, color: rgb(1, 1, 1), borderColor: LINE, borderWidth: 0.45 });
    page.drawText(label, { x: M + half / 2 - fonts.bold.widthOfTextAtSize(label, 8) / 2, y: y - 14, size: 8, font: fonts.bold, color: NAVY });
    value.split("\n").forEach((line, lineIndex) => page.drawText(line, { x: M + half + half / 2 - fonts.regular.widthOfTextAtSize(line, 8) / 2, y: y - 14 - lineIndex * 12, size: 8, font: fonts.regular, color: INK }));
    y -= height;
  });
  return y;
}

function drawTableHeader(page: PDFPage, fonts: Fonts, y: number) {
  let x = M;
  COLUMNS.forEach((column) => {
    page.drawRectangle({ x, y: y - 22, width: column.w, height: 22, color: SOFT, borderColor: LINE, borderWidth: 0.45 });
    page.drawText(column.label, { x: x + 4, y: y - 14, size: 6.7, font: fonts.bold, color: MUTED });
    x += column.w;
  });
  return y - 22;
}

function drawItem(page: PDFPage, fonts: Fonts, y: number, item: { data: Date | null; identificacao: string; descricao: string | null; qtde: unknown; horaTecnica: unknown; descontoPct: unknown; descontoValor: unknown; outrosCustos: unknown; custosAdmFiscais: unknown; total: unknown }, index: number) {
  const descriptionLines = wrap(item.descricao || "—", fonts.regular, 7.8, COLUMNS[2].w - 8);
  const rowHeight = Math.max(24, descriptionLines.length * 10 + 10);
  const values = [formatDate(item.data), item.identificacao, "", String(Number(item.qtde)), money(item.horaTecnica), item.descontoPct == null ? "—" : `${Number(item.descontoPct)}%`, money(item.descontoValor), money(item.outrosCustos), money(item.custosAdmFiscais), money(item.total)];
  let x = M;
  COLUMNS.forEach((column, columnIndex) => {
    page.drawRectangle({ x, y: y - rowHeight, width: column.w, height: rowHeight, color: index % 2 === 0 ? rgb(1, 1, 1) : SOFT, borderColor: LINE, borderWidth: 0.35 });
    if (columnIndex === 2) descriptionLines.forEach((line, lineIndex) => page.drawText(line, { x: x + 4, y: y - 13 - lineIndex * 10, size: 7.8, font: fonts.regular, color: INK }));
    else page.drawText(values[columnIndex], { x: x + 4, y: y - 14, size: 7.2, font: columnIndex === 9 ? fonts.bold : fonts.regular, color: INK });
    x += column.w;
  });
  return y - rowHeight;
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  const fatura = await prisma.fatura.findFirst({ where: { id: Number(id), ativo: true, deletedAt: null }, include: { empresa: true, itens: { orderBy: { id: "asc" } } } });
  if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
  const doc = await PDFDocument.create();
  const fonts: Fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  const logo = await doc.embedJpg(await readFile(`${process.cwd()}/public/logo.jpg`));
  const total = fatura.itens.reduce((sum, item) => sum + Number(item.total), 0);
  let pageNumber = 1;
  let page = doc.addPage([W, H]);
  drawHeader(page, fonts, logo, fatura, pageNumber);
  let y = drawInfoGrid(page, fonts, fatura) - 8;
  y = drawTableHeader(page, fonts, y);
  for (let index = 0; index < fatura.itens.length; index++) {
    const item = fatura.itens[index];
    const descriptionLines = wrap(item.descricao || "—", fonts.regular, 7.8, COLUMNS[2].w - 8);
    const rowHeight = Math.max(24, descriptionLines.length * 10 + 10);
    if (y - rowHeight < 58) {
      page = doc.addPage([W, H]);
      pageNumber += 1;
      drawHeader(page, fonts, logo, fatura, pageNumber);
      y = drawTableHeader(page, fonts, H - 108);
    }
    y = drawItem(page, fonts, y, item, index);
  }
  if (y - 48 < 52) {
    page = doc.addPage([W, H]);
    pageNumber += 1;
    drawHeader(page, fonts, logo, fatura, pageNumber);
    y = H - 108;
  }
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: NAVY });
  page.drawText("TOTAL GERAL", { x: W - M - 154, y: y - 18, size: 8.5, font: fonts.bold, color: NAVY });
  page.drawText(formatMoney(total), { x: W - M - 54, y: y - 18, size: 10, font: fonts.bold, color: NAVY });
  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=fatura-${fatura.numero}-${fatura.ano}.pdf` } });
}
