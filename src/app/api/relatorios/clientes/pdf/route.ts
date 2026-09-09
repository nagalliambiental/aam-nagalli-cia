import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReportPage, createReportDocument, drawReportChrome, drawReportTableHeader, drawReportTableRow, REPORT_PAGE } from "@/lib/relatorio-pdf";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const clientes = await prisma.empresa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { razaoSocial: "asc" },
    include: { contatos: { where: { ativo: true, deletedAt: null } } },
  });

  const { doc, fonts } = await createReportDocument();
  let page = addReportPage(doc);
  const cols = [
    { w: 200, label: "Razão Social" },
    { w: 80, label: "CNPJ" },
    { w: 80, label: "Município/UF" },
    { w: 155, label: "Contatos" },
  ];
  const rowH = 24;
  let y = 690;
  let pageNumber = 1;
  drawReportChrome(page, fonts, "Clientes", clientes.length, pageNumber);
  y = drawReportTableHeader(page, fonts, y, cols);
  for (let index = 0; index < clientes.length; index++) {
    const c = clientes[index];
    if (y - rowH < REPORT_PAGE.bottom) {
      page = addReportPage(doc);
      pageNumber += 1;
      drawReportChrome(page, fonts, "Clientes", clientes.length, pageNumber);
      y = drawReportTableHeader(page, fonts, 690, cols);
    }
    y = drawReportTableRow(page, fonts, y, cols, [
      c.razaoSocial,
      c.cnpj ?? "",
      c.municipio && c.uf ? `${c.municipio}/${c.uf}` : "",
      c.contatos.map((x) => x.nome).filter(Boolean).join(", "),
    ], index);
  }

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=clientes.pdf",
    },
  });
}
