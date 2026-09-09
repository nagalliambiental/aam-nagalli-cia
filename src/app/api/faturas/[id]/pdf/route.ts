import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatCNPJ, formatDate, formatDateTime, formatMoney } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };
type Fonts = { regular: PDFFont; bold: PDFFont };

const W = 841.89;
const H = 595.28;
const M = 36;
const CONTENT_W = W - M * 2;
const NAVY = rgb(0.01, 0.12, 0.3);
const BLUE = rgb(0.04, 0.42, 0.65);
const GOLD = rgb(0.96, 0.61, 0.05);
const INK = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.36, 0.42, 0.49);
const LINE = rgb(0.84, 0.87, 0.91);
const SOFT = rgb(0.96, 0.97, 0.98);

function cut(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function money(value: unknown) {
  return formatMoney(Number(value));
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["—"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current && font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const character of word) {
        const nextChunk = `${chunk}${character}`;
        if (chunk && font.widthOfTextAtSize(nextChunk, size) > maxWidth) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk = nextChunk;
        }
      }
      current = chunk;
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawHeader(page: PDFPage, fonts: Fonts, logo: PDFImage, fatura: { numero: string; ano: number; status: string; empresa: { razaoSocial: string; nomeFantasia: string | null; cnpj: string | null }; recebidoEm: Date | null }, pageNumber: number) {
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: NAVY });
  page.drawImage(logo, { x: M, y: H - 82, width: 150, height: 78 });
  page.drawText("FATURA", { x: W - M - 106, y: H - 38, size: 10, font: fonts.bold, color: GOLD });
  page.drawText(`${fatura.numero}/${fatura.ano}`, { x: W - M - 106, y: H - 61, size: 17, font: fonts.bold, color: rgb(1, 1, 1) });

  page.drawText(fatura.empresa.nomeFantasia || fatura.empresa.razaoSocial, { x: M, y: H - 122, size: 12, font: fonts.bold, color: NAVY });
  page.drawText(`CNPJ: ${formatCNPJ(fatura.empresa.cnpj)}`, { x: M, y: H - 138, size: 8.5, font: fonts.regular, color: MUTED });
  const status = fatura.status === "paga" || fatura.recebidoEm ? "PAGA" : fatura.status.toUpperCase();
  page.drawText(`Status: ${status}`, { x: W - M - 150, y: H - 122, size: 9, font: fonts.bold, color: status === "PAGA" ? rgb(0.05, 0.45, 0.25) : BLUE });
  if (fatura.recebidoEm) page.drawText(`Recebida em ${formatDateTime(fatura.recebidoEm)}`, { x: W - M - 150, y: H - 138, size: 8, font: fonts.regular, color: MUTED });

  page.drawLine({ start: { x: M, y: 34 }, end: { x: W - M, y: 34 }, thickness: 0.6, color: LINE });
  page.drawText("AAM Nagalli & Cia LTDA · Uso interno", { x: M, y: 20, size: 7.5, font: fonts.regular, color: MUTED });
  page.drawText(`Página ${pageNumber}`, { x: W - M - 43, y: 20, size: 7.5, font: fonts.bold, color: MUTED });
}

function drawItemCard(page: PDFPage, fonts: Fonts, y: number, item: { data: Date | null; identificacao: string; descricao: string | null; qtde: unknown; horaTecnica: unknown; descontoPct: unknown; descontoValor: unknown; outrosCustos: unknown; custosAdmFiscais: unknown; total: unknown }, index: number) {
  const titleSize = 8.5;
  const bodySize = 8;
  const detailSize = 7.2;
  const descriptionLines = wrap(item.descricao || "—", fonts.regular, bodySize, CONTENT_W - 24);
  const height = 31 + descriptionLines.length * 11 + 22;
  const top = y;
  page.drawRectangle({ x: M, y: top - height, width: CONTENT_W, height, color: index % 2 === 0 ? rgb(1, 1, 1) : SOFT, borderColor: LINE, borderWidth: 0.6 });
  page.drawText(formatDate(item.data), { x: M + 10, y: top - 17, size: titleSize, font: fonts.regular, color: MUTED });
  page.drawText(cut(item.identificacao, 78), { x: M + 78, y: top - 17, size: titleSize, font: fonts.bold, color: NAVY });
  page.drawText("TOTAL", { x: W - M - 126, y: top - 13, size: 6.8, font: fonts.bold, color: MUTED });
  page.drawText(money(item.total), { x: W - M - 86, y: top - 18, size: 10, font: fonts.bold, color: NAVY });

  const descriptionY = top - 34;
  page.drawText("Descrição", { x: M + 10, y: descriptionY, size: 7, font: fonts.bold, color: BLUE });
  descriptionLines.forEach((line, lineIndex) => page.drawText(line, { x: M + 70, y: descriptionY - lineIndex * 11, size: bodySize, font: fonts.regular, color: INK }));

  const detailY = top - 31 - descriptionLines.length * 11;
  page.drawLine({ start: { x: M + 10, y: detailY }, end: { x: W - M - 10, y: detailY }, thickness: 0.35, color: LINE });
  const details = [
    `Qtde: ${Number(item.qtde)}`,
    `Hora técnica: ${money(item.horaTecnica)}`,
    `Desconto: ${item.descontoPct == null ? "—" : `${Number(item.descontoPct)}% (${money(item.descontoValor)})`}`,
    `Outros custos: ${money(item.outrosCustos)}`,
    `Adm/Fiscais: ${money(item.custosAdmFiscais)}`,
  ];
  const detailWidth = (CONTENT_W - 20) / details.length;
  details.forEach((detail, detailIndex) => page.drawText(detail, { x: M + 10 + detailIndex * detailWidth, y: top - height + 10, size: detailSize, font: fonts.regular, color: MUTED }));
  return top - height - 8;
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
  const fonts: Fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  const logo = await doc.embedJpg(await readFile(`${process.cwd()}/public/logo.jpg`));
  const total = fatura.itens.reduce((sum, item) => sum + Number(item.total), 0);
  let pageNumber = 1;
  let page = doc.addPage([W, H]);
  drawHeader(page, fonts, logo, fatura, pageNumber);

  page.drawText(`Referência: ${cut(fatura.referencia || fatura.empreendimento?.apelido || fatura.empreendimento?.nome || "—", 70)}`, { x: M, y: H - 163, size: 8.5, font: fonts.regular, color: INK });
  page.drawText(`Período: ${fatura.periodo || "—"}`, { x: M + 300, y: H - 163, size: 8.5, font: fonts.regular, color: INK });
  page.drawText(`Vencimento: ${formatDate(fatura.vencimento)}`, { x: W - M - 145, y: H - 163, size: 8.5, font: fonts.bold, color: INK });
  page.drawRectangle({ x: M, y: H - 188, width: CONTENT_W, height: 22, color: BLUE });
  page.drawText("ITENS DA FATURA", { x: M + 10, y: H - 181, size: 8, font: fonts.bold, color: rgb(1, 1, 1) });

  let y = H - 198;
  for (let index = 0; index < fatura.itens.length; index++) {
    const item = fatura.itens[index];
    const descriptionLines = wrap(item.descricao || "—", fonts.regular, 8, CONTENT_W - 24);
    const itemHeight = 31 + descriptionLines.length * 11 + 22;
    if (y - itemHeight < 78) {
      page = doc.addPage([W, H]);
      pageNumber += 1;
      drawHeader(page, fonts, logo, fatura, pageNumber);
      page.drawRectangle({ x: M, y: H - 122, width: CONTENT_W, height: 22, color: BLUE });
      page.drawText("ITENS DA FATURA · CONTINUAÇÃO", { x: M + 10, y: H - 115, size: 8, font: fonts.bold, color: rgb(1, 1, 1) });
      y = H - 132;
    }
    y = drawItemCard(page, fonts, y, item, index);
  }

  if (y - 102 < 62) {
    page = doc.addPage([W, H]);
    pageNumber += 1;
    drawHeader(page, fonts, logo, fatura, pageNumber);
    y = H - 122;
  }
  page.drawRectangle({ x: W - M - 220, y: y - 38, width: 220, height: 38, color: NAVY });
  page.drawText("TOTAL GERAL", { x: W - M - 207, y: y - 24, size: 9, font: fonts.bold, color: rgb(1, 1, 1) });
  page.drawText(formatMoney(total), { x: W - M - 101, y: y - 24, size: 12, font: fonts.bold, color: GOLD });
  page.drawText("Pagamento", { x: M, y: y - 15, size: 8, font: fonts.bold, color: NAVY });
  page.drawText("PIX CNPJ 02.836.099/0001-91 · Banco do Brasil 001 · Agência 4500-4 · Conta Corrente 27.366-0", { x: M, y: y - 29, size: 7.5, font: fonts.regular, color: MUTED });
  if (fatura.observacoes) page.drawText(`Observações: ${cut(fatura.observacoes, 120)}`, { x: M, y: y - 43, size: 7.5, font: fonts.regular, color: MUTED });

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=fatura-${fatura.numero}-${fatura.ano}.pdf` } });
}
