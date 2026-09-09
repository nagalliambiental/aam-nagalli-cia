import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReportPage, createReportDocument, drawReportChrome, drawReportTableHeader, drawReportTableRow, REPORT_PAGE } from "@/lib/relatorio-pdf";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const procs = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { numero: "asc" },
    include: { empreendimento: true },
  });

  const { doc, fonts } = await createReportDocument();
  let page = addReportPage(doc);
  const cols = [
    { w: 120, label: "Número" },
    { w: 100, label: "Natureza" },
    { w: 150, label: "Apelido / Nº da Licença" },
    { w: 145, label: "Status" },
  ];
  const rowH = 24;
  let y = 690;
  let pageNumber = 1;
  drawReportChrome(page, fonts, "Processos", procs.length, pageNumber);
  y = drawReportTableHeader(page, fonts, y, cols);
  for (let index = 0; index < procs.length; index++) {
    const p = procs[index];
    if (y - rowH < REPORT_PAGE.bottom) {
      page = addReportPage(doc);
      pageNumber += 1;
      drawReportChrome(page, fonts, "Processos", procs.length, pageNumber);
      y = drawReportTableHeader(page, fonts, 690, cols);
    }
    const vals = [
      p.apelido || p.numero,
      p.natureza === "ambiental" ? "Ambiental" : "Minerário",
      p.natureza === "ambiental" ? `${p.apelido || "—"} / ${p.numeroLicenca || "—"}` : (p.apelido || p.empreendimento?.apelido || p.empreendimento?.nome || "—"),
      p.status,
    ];
    y = drawReportTableRow(page, fonts, y, cols, vals, index);
  }

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=processos.pdf" },
  });
}
