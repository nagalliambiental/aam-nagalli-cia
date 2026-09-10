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
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Razão Social", key: "razaoSocial", width: 40 },
    { header: "Nome Completo", key: "nomeCompleto", width: 32 },
    { header: "Nome Fantasia", key: "nomeFantasia", width: 28 },
    { header: "Apelido", key: "apelido", width: 22 },
    { header: "CNPJ", key: "cnpj", width: 20 },
    { header: "CPF", key: "cpf", width: 20 },
    { header: "IE", key: "ie", width: 18 },
    { header: "CEP", key: "cep", width: 12 },
    { header: "Endereço", key: "endereco", width: 40 },
    { header: "Nº", key: "numero", width: 10 },
    { header: "Município", key: "municipio", width: 24 },
    { header: "UF", key: "uf", width: 8 },
    { header: "Email", key: "email", width: 28 },
    { header: "Telefone", key: "telefone", width: 18 },
  ];
  clientes.forEach((c) => {
    const tipo = (c as { tipoPessoa?: string }).tipoPessoa === "fisica" ? "PF" : "PJ";
    ws.addRow({
      tipo,
      razaoSocial: tipo === "PJ" ? c.razaoSocial : "",
      nomeCompleto: tipo === "PF" ? c.razaoSocial : "",
      nomeFantasia: c.nomeFantasia ?? "",
      apelido: c.apelido ?? "",
      cnpj: c.cnpj ?? "",
      cpf: (c as { cpf?: string | null }).cpf ?? "",
      ie: c.inscricaoEstadual ?? "",
      cep: c.cep ?? "",
      endereco: c.endereco ?? "",
      numero: c.numeroEndereco ?? "",
      municipio: c.municipio ?? "",
      uf: c.uf ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
    });
  });
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } };

  const contatos = wb.addWorksheet("Contatos");
  contatos.columns = [
    { header: "CPF/CNPJ", key: "documento", width: 22 },
    { header: "Nome", key: "nome", width: 28 },
    { header: "E-mail", key: "email", width: 32 },
    { header: "Telefone", key: "telefone", width: 20 },
    { header: "Assunto", key: "assunto", width: 28 },
  ];
  clientes.forEach((c) => c.contatos.forEach((contato) => contatos.addRow({ documento: (c as { cpf?: string | null }).cpf ?? c.cnpj ?? "", nome: contato.nome ?? "", email: contato.email ?? "", telefone: contato.telefone ?? "", assunto: contato.assunto ?? "" })));
  contatos.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  contatos.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  contatos.views = [{ state: "frozen", ySplit: 1 }];
  contatos.autoFilter = { from: "A1", to: { row: 1, column: contatos.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=clientes.xlsx",
    },
  });
}
