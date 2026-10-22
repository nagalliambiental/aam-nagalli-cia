import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

const CABECALHOS = ["Nome", "Apelido", "Tipo", "Cliente Principal", "CNPJ (se filial)", "É Filial (Sim/Não)", "Município", "UF", "CEP", "Endereço", "Status"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Empreendimentos");
  ws.addRow(CABECALHOS);
  ws.addRow(["Pedreira Exemplo", "Matriz", "Pedreira", "Nome do Cliente", "", "Não", "Cascavel", "PR", "85800-000", "Rua Exemplo, 123", "ativo"]);
  ws.addRow(["Pedreira Exemplo Filial", "Filial", "Pedreira", "Nome do Cliente", "00.000.000/0001-00", "Sim", "Cascavel", "PR", "85800-000", "Rua Exemplo, 456", "ativo"]);
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  const larguras = [40, 24, 22, 40, 24, 18, 24, 8, 12, 40, 12];
  ws.columns.forEach((col, i) => { if (col && "width" in col) (col as { width: number }).width = larguras[i] ?? 20; });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=modelo-empreendimentos.xlsx",
    },
  });
}
