import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const clientes = await prisma.empresa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { razaoSocial: "asc" },
    include: { contatos: { where: { ativo: true, deletedAt: null } } },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "AAM Nagalli";

  const ws = wb.addWorksheet("Clientes");
  ws.columns = [
    { header: "Razão Social", key: "razaoSocial", width: 40 },
    { header: "Nome Fantasia", key: "nomeFantasia", width: 28 },
    { header: "Apelido", key: "apelido", width: 22 },
    { header: "CNPJ", key: "cnpj", width: 20 },
    { header: "IE", key: "ie", width: 18 },
    { header: "CEP", key: "cep", width: 12 },
    { header: "Endereço", key: "endereco", width: 40 },
    { header: "Nº", key: "numero", width: 10 },
    { header: "Município", key: "municipio", width: 24 },
    { header: "UF", key: "uf", width: 8 },
    { header: "Email", key: "email", width: 28 },
    { header: "Telefone", key: "telefone", width: 18 },
    { header: "Contatos", key: "contatos", width: 50 },
  ];
  clientes.forEach((c) => {
    ws.addRow({
      razaoSocial: c.razaoSocial,
      nomeFantasia: c.nomeFantasia ?? "",
      apelido: c.apelido ?? "",
      cnpj: c.cnpj ?? "",
      ie: c.inscricaoEstadual ?? "",
      cep: c.cep ?? "",
      endereco: c.endereco ?? "",
      numero: c.numeroEndereco ?? "",
      municipio: c.municipio ?? "",
      uf: c.uf ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      contatos: c.contatos.map((x) => [x.nome, x.email, x.telefone, x.assunto].filter(Boolean).join(" | ")).join(" ; "),
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
      "Content-Disposition": "attachment; filename=clientes.xlsx",
    },
  });
}
