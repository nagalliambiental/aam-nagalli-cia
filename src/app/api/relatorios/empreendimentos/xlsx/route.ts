import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const emps = await prisma.empreendimento.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
    include: { empresaPrincipal: true },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "AAM Nagalli";
  const ws = wb.addWorksheet("Empreendimentos");
  ws.columns = [
    { header: "Nome", key: "nome", width: 40 },
    { header: "Apelido", key: "apelido", width: 24 },
    { header: "Tipo", key: "tipo", width: 22 },
    { header: "Empresa Principal", key: "empresa", width: 40 },
    { header: "Município", key: "municipio", width: 24 },
    { header: "UF", key: "uf", width: 8 },
    { header: "CEP", key: "cep", width: 12 },
    { header: "Endereço", key: "endereco", width: 40 },
    { header: "Status", key: "status", width: 12 },
  ];
  emps.forEach((e) => {
    ws.addRow({
      nome: e.nome,
      apelido: e.apelido ?? "",
      tipo: e.tipo,
      empresa: e.empresaPrincipal.nomeFantasia || e.empresaPrincipal.razaoSocial,
      municipio: e.municipio ?? "",
      uf: e.uf ?? "",
      cep: e.cep ?? "",
      endereco: e.endereco ?? "",
      status: e.status,
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
      "Content-Disposition": "attachment; filename=empreendimentos.xlsx",
    },
  });
}
