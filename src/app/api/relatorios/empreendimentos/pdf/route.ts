import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReportPage, createReportDocument, drawReportChrome, drawReportTableHeader, drawReportTableRow, REPORT_PAGE } from "@/lib/relatorio-pdf";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const emps = await prisma.empreendimento.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
    include: { empresaPrincipal: true },
  });

  const { doc, fonts } = await createReportDocument();
  let page = addReportPage(doc);
  const cols = [
    { w: 150, label: "Nome" },
    { w: 90, label: "Tipo" },
    { w: 150, label: "Cliente" },
    { w: 125, label: "Município/UF" },
  ];
  const rowH = 24;
  let y = 690;
  let pageNumber = 1;
  drawReportChrome(page, fonts, "Empreendimentos", emps.length, pageNumber);
  y = drawReportTableHeader(page, fonts, y, cols);
  for (let index = 0; index < emps.length; index++) {
    const e = emps[index];
    if (y - rowH < REPORT_PAGE.bottom) {
      page = addReportPage(doc);
      pageNumber += 1;
      drawReportChrome(page, fonts, "Empreendimentos", emps.length, pageNumber);
      y = drawReportTableHeader(page, fonts, 690, cols);
    }
    const vals = [
      e.apelido ? `${e.nome} (${e.apelido})` : e.nome,
      e.tipo,
      e.empresaPrincipal.nomeFantasia || e.empresaPrincipal.razaoSocial,
      e.municipio && e.uf ? `${e.municipio}/${e.uf}` : "",
    ];
    y = drawReportTableRow(page, fonts, y, cols, vals, index);
  }

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=empreendimentos.pdf" },
  });
}
