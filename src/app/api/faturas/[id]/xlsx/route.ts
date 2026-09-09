import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { formatCNPJ } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  const fatura = await prisma.fatura.findFirst({ where: { id: Number(id), ativo: true, deletedAt: null }, include: { empresa: true, empreendimento: true, itens: { orderBy: { id: "asc" } } } });
  if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "AAM Nagalli & Cia";
  wb.created = new Date();
  const ws = wb.addWorksheet("Fatura");
  ws.properties.defaultRowHeight = 20;
  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = `AAM NAGALLI & CIA · FATURA ${fatura.numero}/${fatura.ano}`;
  ws.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
  ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  ws.getCell("A1").alignment = { vertical: "middle" };
  ws.getRow(1).height = 32;
  ws.getCell("A3").value = "Cliente"; ws.getCell("B3").value = fatura.empresa.nomeFantasia || fatura.empresa.razaoSocial;
  ws.getCell("A4").value = "CNPJ"; ws.getCell("B4").value = formatCNPJ(fatura.empresa.cnpj);
  ws.getCell("D3").value = "Referência"; ws.getCell("E3").value = fatura.referencia || fatura.empreendimento?.apelido || fatura.empreendimento?.nome || "";
  ws.getCell("D4").value = "Vencimento"; ws.getCell("E4").value = fatura.vencimento ?? "";
  for (const cell of ["A3", "A4", "D3", "D4"]) { ws.getCell(cell).font = { bold: true, color: { argb: "FF021E4C" } }; }
  ws.getRow(6).values = ["Data", "Identificação", "Descrição", "Qtde", "Hora técnica", "Desconto %", "Desconto valor", "Outros custos", "Adm/Fiscais", "Total"];
  const header = ws.getRow(6);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B6BA8" } };
  header.alignment = { vertical: "middle", wrapText: true };
  for (const item of fatura.itens) {
    ws.addRow([item.data ?? "", item.identificacao, item.descricao ?? "", Number(item.qtde), Number(item.horaTecnica), item.descontoPct == null ? "" : Number(item.descontoPct), Number(item.descontoValor), Number(item.outrosCustos), Number(item.custosAdmFiscais), Number(item.total)]);
  }
  const totalRow = ws.addRow([]);
  totalRow.getCell(9).value = "TOTAL GERAL";
  totalRow.getCell(10).value = { formula: `SUM(J7:J${Math.max(6, ws.rowCount - 1)})` };
  totalRow.font = { bold: true, color: { argb: "FF021E4C" } };
  totalRow.getCell(10).numFmt = 'R$ #,##0.00';
  ws.columns = [
    { width: 14 }, { width: 34 }, { width: 44 }, { width: 10 }, { width: 15 }, { width: 13 }, { width: 16 }, { width: 15 }, { width: 15 }, { width: 16 },
  ];
  for (let row = 7; row <= ws.rowCount; row++) {
    ws.getCell(`A${row}`).numFmt = "dd/mm/yyyy";
    for (const col of ["D", "E", "F", "G", "H", "I", "J"]) ws.getCell(`${col}${row}`).numFmt = '#,##0.00';
  }
  ws.views = [{ state: "frozen", ySplit: 6 }];
  ws.autoFilter = { from: "A6", to: { row: 6, column: 10 } };
  ws.getCell(`A${ws.rowCount + 2}`).value = "Pagamento: PIX CNPJ 02.836.099/0001-91 · Banco do Brasil 001 · Agência 4500-4 · CC 27.366-0";
  ws.mergeCells(`A${ws.rowCount}:J${ws.rowCount}`);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename=fatura-${fatura.numero}-${fatura.ano}.xlsx` } });
}
