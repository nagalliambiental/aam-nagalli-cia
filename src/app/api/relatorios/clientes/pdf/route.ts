import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const clientes = await prisma.empresa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { razaoSocial: "asc" },
    include: { contatos: { where: { ativo: true, deletedAt: null } } },
  });

  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const M = 40; // margem
  const cols = [
    { w: 200, label: "Razão Social" },
    { w: 80, label: "CNPJ" },
    { w: 80, label: "Município/UF" },
    { w: 155, label: "Contatos" },
  ];
  const rowH = 18;
  const headerH = 22;

  function drawHeader() {
    page.drawText("AAM Nagalli & Cia LTDA", { x: M, y: 800, size: 16, font: bold, color: rgb(0.01, 0.12, 0.30) });
    page.drawText(`Clientes · ${new Date().toLocaleDateString("pt-BR")} · ${clientes.length} cliente(s)`, { x: M, y: 780, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  }

  function drawTableHeader(y: number) {
    let x = M;
    for (const c of cols) {
      page.drawRectangle({ x, y: y - headerH, width: c.w, height: headerH, color: rgb(0.01, 0.12, 0.30) });
      page.drawText(c.label.toUpperCase(), { x: x + 4, y: y - 15, size: 9, font: bold, color: rgb(1, 1, 1) });
      x += c.w;
    }
    page.drawLine({ start: { x: M, y: y - headerH }, end: { x: M + cols.reduce((s, c) => s + c.w, 0), y: y - headerH }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    return y - headerH;
  }

  function drawRow(y: number, vals: string[]) {
    let x = M;
    for (let i = 0; i < cols.length; i++) {
      const text = (vals[i] ?? "").slice(0, Math.floor(cols[i].w / 7));
      page.drawText(text, { x: x + 4, y: y - 13, size: 9, font });
      x += cols[i].w;
    }
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + cols.reduce((s, c) => s + c.w, 0), y: y - rowH }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) });
    return y - rowH;
  }

  const bottom = 50;
  let y = 760;
  drawHeader();
  y = drawTableHeader(y);
  for (const c of clientes) {
    if (y - rowH < bottom) {
      page = doc.addPage([595.28, 841.89]);
      page.drawText("AAM Nagalli & Cia LTDA", { x: M, y: 800, size: 10, font: bold, color: rgb(0.4, 0.4, 0.4) });
      y = drawTableHeader(790);
    }
    y = drawRow(y, [
      c.razaoSocial,
      c.cnpj ?? "",
      c.municipio && c.uf ? `${c.municipio}/${c.uf}` : "",
      c.contatos.map((x) => x.nome).filter(Boolean).join(", "),
    ]);
  }

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=clientes.pdf",
    },
  });
}
