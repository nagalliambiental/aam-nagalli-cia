import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

const CABECALHOS = [
  "Natureza", "Número", "Apelido", "NUP", "URL SEI", "Empreendimento", "Responsável",
  "Fase", "Status", "Área", "Unidade", "Substâncias", "Guia",
  "Nº Licença", "Nº Protocolo", "Atividade", "Modalidade", "Órgão", "Validade", "Data Protocolo", "Alerta", "Observações",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Processos");
  ws.addRow(CABECALHOS);
  ws.addRow([
    "minerario", "815.310/2008", "Pedreira Norte", "48411.815310/2008-81", "https://...md_pesq_processo_exibir.php?token=...",
    "Pedreira Cordilheira Alta", "Bruno Nagalli", "Concessão de Lavra", "ativo", "100", "ha", "Basalto (Brita)", "não",
    "", "", "", "", "", "", "", "", "",
  ]);
  ws.addRow([
    "ambiental", "", "LO Trevo", "", "", "Pedreira do Trevo", "Ana", "", "ativo", "", "", "", "",
    "89043032", "153521794", "Extração de basalto", "Licença de Operação", "IAT", "07/05/2031", "07/05/2026", "30", "",
  ]);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((col) => { if (col && "width" in col) (col as { width: number }).width = 22; });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=modelo-processos.xlsx",
    },
  });
}
