import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const procs = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { numero: "asc" },
    include: { empreendimento: true },
  });

  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const M = 40;
  const cols = [
    { w: 120, label: "Número" },
    { w: 100, label: "Natureza" },
    { w: 150, label: "Empreendimento" },
    { w: 145, label: "Status" },
  ];
  const rowH = 18;
  const headerH = 22;
  const bottom = 50;
  const totalW = cols.reduce((s, c) => s + c.w, 0);

  function tabelaHeader(y: number) {
    let x = M;
    for (const c of cols) {
      page.drawRectangle({ x, y: y - headerH, width: c.w, height: headerH, color: rgb(0.01, 0.12, 0.3) });
      page.drawText(c.label.toUpperCase(), { x: x + 4, y: y - 15, size: 9, font: bold, color: rgb(1, 1, 1) });
      x += c.w;
    }
    return y - headerH;
  }

  let y = 760;
  page.drawText("AAM Nagalli & Cia LTDA", { x: M, y: 800, size: 16, font: bold, color: rgb(0.01, 0.12, 0.3) });
  page.drawText(`Processos · ${new Date().toLocaleDateString("pt-BR")} · ${procs.length}`, { x: M, y: 780, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y = tabelaHeader(y);
  for (const p of procs) {
    if (y - rowH < bottom) {
      page = doc.addPage([595.28, 841.89]);
      y = tabelaHeader(790);
    }
    const vals = [
      p.apelido || p.numero,
      p.natureza === "ambiental" ? "Ambiental" : "Minerário",
      p.empreendimento?.apelido || p.empreendimento?.nome || "",
      p.status,
    ];
    let x = M;
    for (let i = 0; i < cols.length; i++) {
      page.drawText(vals[i].slice(0, Math.floor(cols[i].w / 7)), { x: x + 4, y: y - 13, size: 9, font });
      x += cols[i].w;
    }
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + totalW, y: y - rowH }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) });
    y -= rowH;
  }

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=processos.pdf" },
  });
}
