import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

const CABECALHOS = ["Tipo", "Razão Social", "Nome Completo", "Nome Fantasia", "Apelido", "CNPJ", "CPF", "IE", "CEP", "Endereço", "Nº", "Município", "UF", "E-mail", "Telefone"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clientes");
  ws.addRow(CABECALHOS);
   ws.addRow(["PJ", "Razão Social Exemplo LTDA", "", "Fantasia Exemplo", "Matriz", "00.000.000/0000-00", "", "1234567", "85800-000", "Rua Exemplo", "123", "Cascavel", "PR", "contato@exemplo.com", "(45) 99999-9999"]);
   ws.addRow(["PF", "", "Nome Completo Exemplo", "", "", "", "000.000.000-00", "", "85800-000", "Rua Exemplo", "123", "Cascavel", "PR", "contato@exemplo.com", "(45) 99999-9999"]);
   ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
   ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
   ws.columns.forEach((col, i) => { if (col && "width" in col) (col as { width: number }).width = [10, 40, 32, 28, 22, 22, 20, 16, 12, 36, 8, 24, 8, 28, 20][i] ?? 20; });

   const contatos = wb.addWorksheet("Contatos");
   contatos.addRow(["CPF/CNPJ", "Nome", "E-mail", "Telefone", "Assunto"]);
   contatos.addRow(["00.000.000/0000-00", "João da Silva", "joao@exemplo.com", "(45) 99999-9999", "Financeiro"]);
   contatos.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
   contatos.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
   [22, 28, 32, 20, 28].forEach((width, i) => { contatos.getColumn(i + 1).width = width; });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=modelo-clientes.xlsx",
    },
  });
}
