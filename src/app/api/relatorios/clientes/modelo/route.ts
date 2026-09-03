import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

const CABECALHOS = ["Razão Social", "Nome Fantasia", "Apelido", "CNPJ", "IE", "CEP", "Endereço", "Nº", "Município", "UF", "E-mail", "Telefone"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clientes");
  ws.addRow(CABECALHOS);
  ws.addRow(["Razão Social Exemplo LTDA", "Fantasia Exemplo", "Matriz", "00.000.000/0000-00", "1234567", "85800-000", "Rua Exemplo", "123", "Cascavel", "PR", "contato@exemplo.com", "(45) 99999-9999"]);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((col, i) => { if (col && "width" in col) (col as { width: number }).width = [40, 28, 22, 22, 16, 12, 36, 8, 24, 8, 28, 20][i] ?? 20; });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=modelo-clientes.xlsx",
    },
  });
}
