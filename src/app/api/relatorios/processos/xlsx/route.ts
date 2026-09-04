import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const procs = await prisma.processo.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { numero: "asc" },
    include: { empreendimento: true, responsavel: true },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "AAM Nagalli";
  const ws = wb.addWorksheet("Processos");
  ws.columns = [
    { header: "Natureza", key: "natureza", width: 12 },
    { header: "Número", key: "numero", width: 18 },
    { header: "Apelido", key: "apelido", width: 28 },
    { header: "NUP", key: "nup", width: 24 },
    { header: "URL SEI", key: "seiUrl", width: 50 },
    { header: "Empreendimento", key: "empreendimento", width: 32 },
    { header: "Responsável", key: "responsavel", width: 24 },
    { header: "Fase", key: "fase", width: 28 },
    { header: "Status", key: "status", width: 14 },
    { header: "Área", key: "area", width: 14 },
    { header: "Substâncias", key: "substancias", width: 30 },
    { header: "Nº Licença", key: "numeroLicenca", width: 16 },
    { header: "Nº Protocolo", key: "numeroProtocolo", width: 18 },
    { header: "Atividade", key: "atividade", width: 32 },
    { header: "Modalidade", key: "modalidade", width: 26 },
    { header: "Órgão", key: "orgaoAmbiental", width: 12 },
    { header: "Validade", key: "validade", width: 12 },
    { header: "Data Protocolo", key: "dataProtocolo", width: 14 },
  ];
  procs.forEach((p) => {
    ws.addRow({
      natureza: p.natureza,
      numero: p.numero,
      apelido: p.apelido ?? "",
      nup: p.nup ?? "",
      seiUrl: p.seiUrl ?? "",
      empreendimento: p.empreendimento?.apelido || p.empreendimento?.nome || "",
      responsavel: p.responsavel?.nome || "",
      fase: p.fase ?? "",
      status: p.status,
      area: p.areaValor != null ? `${p.areaValor} ${p.areaUnidade}` : "",
      substancias: p.substancias ?? "",
      numeroLicenca: p.numeroLicenca ?? "",
      numeroProtocolo: p.numeroProtocolo ?? "",
      atividade: p.atividade ?? "",
      modalidade: p.modalidade ?? "",
      orgaoAmbiental: p.orgaoAmbiental ?? "",
      validade: p.validade ? p.validade.toISOString().slice(0, 10) : "",
      dataProtocolo: p.dataProtocolo ? p.dataProtocolo.toISOString().slice(0, 10) : "",
    });
  });
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=processos.xlsx",
    },
  });
}
