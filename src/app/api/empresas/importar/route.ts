import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import ExcelJS from "exceljs";

function normalizar(v: unknown) { return String(v ?? "").trim(); }
function chave(v: unknown) { return normalizar(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function valor(row: ExcelJS.Row, headers: Map<string, number>, nome: string, fallback: number) {
  return normalizar(row.getCell(headers.get(chave(nome)) ?? fallback).value);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:criar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo XLSX obrigatório" }, { status: 400 });
  if (!/\.xlsx$/i.test(file.name)) return NextResponse.json({ error: "Envie um arquivo Excel (.xlsx)" }, { status: 400 });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  const clientesWs = wb.getWorksheet("Clientes") ?? wb.worksheets[0];
  if (!clientesWs) return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });
  const contatosWs = wb.getWorksheet("Contatos");
  const headers = new Map<string, number>();
  clientesWs.getRow(1).eachCell((cell, col) => headers.set(chave(cell.value), col));
  const contatosHeaders = new Map<string, number>();
  contatosWs?.getRow(1).eachCell((cell, col) => contatosHeaders.set(chave(cell.value), col));

  let criadas = 0;
  let contatosCriados = 0;
  const erros: string[] = [];
  const porCnpj = new Map<string, number>();

  for (let i = 2; i <= clientesWs.rowCount; i++) {
    const row = clientesWs.getRow(i);
    const razaoSocial = valor(row, headers, "Razão Social", 1);
    const nomeFantasia = valor(row, headers, "Nome Fantasia", 2) || null;
    const apelido = valor(row, headers, "Apelido", 3) || null;
    const cnpj = valor(row, headers, "CNPJ", 4).replace(/\D/g, "") || null;
    if (!razaoSocial) { if (cnpj || nomeFantasia) erros.push(`Linha ${i}: sem Razão Social.`); continue; }
    try {
      let empresaId: number;
      const existente = cnpj ? await prisma.empresa.findUnique({ where: { cnpj }, select: { id: true } }) : null;
      if (existente) {
        empresaId = existente.id;
        erros.push(`Linha ${i}: cliente com CNPJ ${cnpj} já existe; contatos serão vinculados a ele.`);
      } else {
        const emp = await prisma.empresa.create({ data: {
          razaoSocial, nomeFantasia, apelido, cnpj,
          inscricaoEstadual: valor(row, headers, "IE", 5) || null,
          cep: valor(row, headers, "CEP", 6) || null,
          endereco: valor(row, headers, "Endereço", 7) || null,
          numeroEndereco: valor(row, headers, "Nº", 8) || null,
          municipio: valor(row, headers, "Município", 9) || null,
          uf: valor(row, headers, "UF", 10) || null,
          email: valor(row, headers, "E-mail", 11) || null,
          telefone: valor(row, headers, "Telefone", 12) || null,
        } });
        empresaId = emp.id;
        criadas++;
        await audit({ tipoEntidade: "empresa", entidadeId: emp.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: emp.razaoSocial });
      }
      if (cnpj) porCnpj.set(cnpj, empresaId);
    } catch { erros.push(`Linha ${i}: erro ao criar ou localizar cliente.`); }
  }

  if (contatosWs) {
    for (let i = 2; i <= contatosWs.rowCount; i++) {
      const row = contatosWs.getRow(i);
      const cnpj = valor(row, contatosHeaders, "CNPJ", 1).replace(/\D/g, "");
      const nome = valor(row, contatosHeaders, "Nome", 2);
      if (!nome && !cnpj) continue;
      const empresaId = cnpj && porCnpj.get(cnpj);
      if (!empresaId) { erros.push(`Contatos, linha ${i}: cliente não encontrado pelo CNPJ.`); continue; }
      try {
        await prisma.contatoCliente.create({ data: { empresaId, nome: nome || null, email: valor(row, contatosHeaders, "E-mail", 3) || null, telefone: valor(row, contatosHeaders, "Telefone", 4) || null, assunto: valor(row, contatosHeaders, "Assunto", 5) || null } });
        contatosCriados++;
      } catch { erros.push(`Contatos, linha ${i}: erro ao criar contato.`); }
    }
  }
  return NextResponse.json({ criadas, contatosCriados, erros });
}
