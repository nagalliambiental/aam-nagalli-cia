import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import ExcelJS from "exceljs";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

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

  const empresas = await prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, razaoSocial: true, nomeFantasia: true, apelido: true } });
  const normalizar = (v: unknown) => String(v ?? "").trim();

  let criados = 0;
  const erros: string[] = [];

  for (let i = 2; i <= ws.rowCount; i++) {
    const r = ws.getRow(i);
    const nome = normalizar(r.getCell(1).value);
    const apelido = normalizar(r.getCell(2).value) || null;
    const tipo = normalizar(r.getCell(3).value) || "pedreira";
    const empresaNome = normalizar(r.getCell(4).value);
    const municipio = normalizar(r.getCell(5).value) || null;
    const uf = normalizar(r.getCell(6).value) || null;
    const cep = normalizar(r.getCell(7).value) || null;
    const endereco = normalizar(r.getCell(8).value) || null;
    const status = normalizar(r.getCell(9).value) || "ativo";

    if (!nome) continue;
    if (!empresaNome) { erros.push(`Linha ${i}: sem Empresa Principal.`); continue; }

    const ne = norm(empresaNome);
    const empresa = empresas.find((e) => norm(e.razaoSocial) === ne || (e.nomeFantasia && norm(e.nomeFantasia) === ne) || (e.apelido && norm(e.apelido) === ne));
    if (!empresa) { erros.push(`Linha ${i}: Empresa "${empresaNome}" não encontrada.`); continue; }

    const existente = await prisma.empreendimento.findFirst({
      where: { empresaPrincipalId: empresa.id, nome: { equals: nome, mode: "insensitive" }, ativo: true, deletedAt: null },
      select: { id: true },
    });
    if (existente) { erros.push(`Linha ${i}: Empreendimento "${nome}" já cadastrado.`); continue; }

    try {
      const emp = await prisma.empreendimento.create({
        data: { nome, apelido, tipo, empresaPrincipalId: empresa.id, municipio, uf, cep, endereco, status },
      });
      await prisma.empreendimentoEmpresa.create({ data: { empreendimentoId: emp.id, empresaId: empresa.id, papel: "operador", principal: true } });
      await audit({ tipoEntidade: "empreendimento", entidadeId: emp.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: emp.nome });
      criados++;
    } catch {
      erros.push(`Linha ${i}: Erro ao criar.`);
    }
  }

  return NextResponse.json({ criados, erros });
}
