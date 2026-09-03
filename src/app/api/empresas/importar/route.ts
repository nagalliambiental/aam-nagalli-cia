import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("cadastro:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo XLSX obrigatório" }, { status: 400 });
  if (!/\.(xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: "Envie um arquivo Excel (.xlsx)" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });

  const normalizar = (v: unknown) => String(v ?? "").trim();

  let criadas = 0;
  const erros: string[] = [];

  for (let i = 2; i <= ws.rowCount; i++) {
    const r = ws.getRow(i);
    const razaoSocial = normalizar(r.getCell(1).value);
    const nomeFantasia = normalizar(r.getCell(2).value) || null;
    const apelido = normalizar(r.getCell(3).value) || null;
    const cnpj = normalizar(r.getCell(4).value).replace(/\D/g, "") || null;
    const ie = normalizar(r.getCell(5).value) || null;
    const cep = normalizar(r.getCell(6).value) || null;
    const endereco = normalizar(r.getCell(7).value) || null;
    const numeroEndereco = normalizar(r.getCell(8).value) || null;
    const municipio = normalizar(r.getCell(9).value) || null;
    const uf = normalizar(r.getCell(10).value) || null;
    const email = normalizar(r.getCell(11).value) || null;
    const telefone = normalizar(r.getCell(12).value) || null;

    if (!razaoSocial) { if (cnpj || nomeFantasia) erros.push(`Linha ${i}: sem Razão Social.`); continue; }

    if (cnpj) {
      const existente = await prisma.empresa.findUnique({ where: { cnpj }, select: { id: true } });
      if (existente) { erros.push(`Linha ${i}: Já existe empresa com CNPJ ${cnpj}.`); continue; }
    }

    try {
      const emp = await prisma.empresa.create({
        data: { razaoSocial, nomeFantasia, apelido, cnpj, inscricaoEstadual: ie, cep, endereco, numeroEndereco, municipio, uf, email, telefone },
      });
      await audit({ tipoEntidade: "empresa", entidadeId: emp.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: emp.razaoSocial });
      criadas++;
    } catch {
      erros.push(`Linha ${i}: Erro ao criar.`);
    }
  }

  return NextResponse.json({ criadas, erros });
}
