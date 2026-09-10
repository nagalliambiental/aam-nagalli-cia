import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";
import { buscarRelatorioGerencial, RelatorioGerencialTipo } from "@/lib/relatorios-gerenciais";

type Ctx = { params: Promise<{ tipo: string }> };
const TIPOS = new Set<RelatorioGerencialTipo>(["clientes", "empreendimentos", "processos-minerarios", "processos-ambientais", "prazos"]);

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { tipo } = await params;
  if (!TIPOS.has(tipo as RelatorioGerencialTipo)) return NextResponse.json({ error: "Relatório inválido" }, { status: 404 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const dias = url.searchParams.get("dias") ?? undefined;
  const relatorio = await buscarRelatorioGerencial(tipo as RelatorioGerencialTipo, { status, dias });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AAM Nagalli & Cia";
  const worksheet = workbook.addWorksheet(relatorio.titulo);
  worksheet.columns = relatorio.colunas.map((column) => ({ header: column.label, key: column.key, width: Math.max(18, Math.min(48, column.label.length + 12)) }));
  relatorio.linhas.forEach((linha) => worksheet.addRow(Object.fromEntries(linha.map((value, index) => [`coluna${index}`, value]))));
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  header.alignment = { vertical: "middle", wrapText: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: { row: 1, column: relatorio.colunas.length } };
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename=${tipo}.xlsx` } });
}
