import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [empresas, empreendimentos, processos, titulos, licencas, prazos, tarefas, exigencias, contratos] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { razaoSocial: "asc" } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, include: { empresaPrincipal: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { numero: "asc" }, include: { orgao: true, tipoProcesso: true, empreendimento: true } }),
    prisma.tituloMinerario.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { numero: "asc" }, include: { tipoTitulo: true, orgao: true } }),
    prisma.licenca.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { numero: "asc" }, include: { tipoLicenca: true, orgao: true } }),
    prisma.prazo.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { dataCalculadaAtual: "asc" }, include: { processo: true } }),
    prisma.tarefa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { titulo: "asc" }, include: { responsavel: true, processo: true } }),
    prisma.exigencia.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { descricao: "asc" }, include: { processo: true, orgao: true, responsavel: true } }),
    prisma.contrato.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { numero: "asc" }, include: { empresa: true } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "AAM Nagalli";

  const addSheet = (name: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) => {
    const ws = wb.addWorksheet(name);
    ws.columns = columns;
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
    ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    rows.forEach((r) => ws.addRow(r));
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: "A1", to: { row: 1, column: columns.length } };
  };

  addSheet("Clientes_Empresas", [
    { header: "ID", key: "id", width: 8 },
    { header: "Razão Social", key: "razaoSocial", width: 35 },
    { header: "Nome Fantasia", key: "nomeFantasia", width: 25 },
    { header: "Apelido", key: "apelido", width: 18 },
    { header: "CNPJ", key: "cnpj", width: 20 },
    { header: "Município", key: "municipio", width: 18 },
    { header: "UF", key: "uf", width: 6 },
    { header: "E-mail", key: "email", width: 25 },
    { header: "Telefone", key: "telefone", width: 16 },
  ], empresas.map((e) => ({ id: e.id, razaoSocial: e.razaoSocial, nomeFantasia: e.nomeFantasia, apelido: (e as unknown as { apelido?: string }).apelido, cnpj: e.cnpj, municipio: e.municipio, uf: e.uf, email: e.email, telefone: e.telefone })));

  addSheet("Empreendimentos", [
    { header: "ID", key: "id", width: 8 },
    { header: "Nome", key: "nome", width: 30 },
    { header: "Apelido", key: "apelido", width: 18 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Empresa Principal", key: "empresa", width: 30 },
    { header: "Município", key: "municipio", width: 18 },
    { header: "UF", key: "uf", width: 6 },
    { header: "Status", key: "status", width: 12 },
  ], empreendimentos.map((e) => ({ id: e.id, nome: e.nome, apelido: (e as unknown as { apelido?: string }).apelido, tipo: e.tipo, empresa: e.empresaPrincipal.razaoSocial, municipio: e.municipio, uf: e.uf, status: e.status })));

  addSheet("Processos", [
    { header: "ID", key: "id", width: 8 },
    { header: "Número", key: "numero", width: 18 },
    { header: "NUP", key: "nup", width: 22 },
    { header: "Órgão", key: "orgao", width: 10 },
    { header: "Tipo", key: "tipo", width: 22 },
    { header: "Fase", key: "fase", width: 22 },
    { header: "Área", key: "area", width: 12 },
    { header: "Empreendimento", key: "empreendimento", width: 25 },
    { header: "Status", key: "status", width: 12 },
  ], processos.map((p) => ({ id: p.id, numero: p.numero, nup: (p as unknown as { nup?: string }).nup, orgao: p.orgao.sigla, tipo: p.tipoProcesso.nome, fase: p.fase, area: (p as unknown as { areaValor?: number; areaUnidade?: string }).areaValor ? `${(p as unknown as { areaValor?: number }).areaValor} ${(p as unknown as { areaUnidade?: string }).areaUnidade}` : "", empreendimento: p.empreendimento?.nome, status: p.status })));

  addSheet("Titulos", [
    { header: "ID", key: "id", width: 8 },
    { header: "Número", key: "numero", width: 18 },
    { header: "Tipo", key: "tipo", width: 18 },
    { header: "Órgão", key: "orgao", width: 10 },
    { header: "Situação", key: "situacao", width: 12 },
    { header: "Validade", key: "validade", width: 14 },
  ], titulos.map((t) => ({ id: t.id, numero: t.numero, tipo: t.tipoTitulo.nome, orgao: t.orgao.sigla, situacao: t.situacao, validade: t.validade ? new Date(t.validade).toLocaleDateString("pt-BR") : "" })));

  addSheet("Licencas", [
    { header: "ID", key: "id", width: 8 },
    { header: "Número", key: "numero", width: 18 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Órgão", key: "orgao", width: 10 },
    { header: "Situação", key: "situacao", width: 12 },
    { header: "Validade", key: "validade", width: 14 },
  ], licencas.map((l) => ({ id: l.id, numero: l.numero, tipo: l.tipoLicenca.nome, orgao: l.orgao.sigla, situacao: l.situacao, validade: l.dataValidade ? new Date(l.dataValidade).toLocaleDateString("pt-BR") : "" })));

  addSheet("Prazos", [
    { header: "ID", key: "id", width: 8 },
    { header: "Descrição", key: "descricao", width: 40 },
    { header: "Processo", key: "processo", width: 18 },
    { header: "Vencimento", key: "vencimento", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ], prazos.map((p) => ({ id: p.id, descricao: p.descricao, processo: p.processo?.numero, vencimento: p.dataCalculadaAtual ? new Date(p.dataCalculadaAtual).toLocaleDateString("pt-BR") : "", status: p.status })));

  addSheet("Tarefas", [
    { header: "ID", key: "id", width: 8 },
    { header: "Título", key: "titulo", width: 35 },
    { header: "Responsável", key: "responsavel", width: 20 },
    { header: "Processo", key: "processo", width: 18 },
    { header: "Prazo", key: "prazo", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ], tarefas.map((t) => ({ id: t.id, titulo: t.titulo, responsavel: t.responsavel?.nome, processo: t.processo?.numero, prazo: t.prazoData ? new Date(t.prazoData).toLocaleDateString("pt-BR") : "", status: t.status })));

  addSheet("Exigencias", [
    { header: "ID", key: "id", width: 8 },
    { header: "Descrição", key: "descricao", width: 45 },
    { header: "Processo", key: "processo", width: 18 },
    { header: "Órgão", key: "orgao", width: 10 },
    { header: "Responsável", key: "responsavel", width: 20 },
    { header: "Prazo", key: "prazo", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ], exigencias.map((e) => ({ id: e.id, descricao: e.descricao.slice(0, 80), processo: e.processo?.numero, orgao: e.orgao.sigla, responsavel: e.responsavel?.nome, prazo: e.prazoResposta ? new Date(e.prazoResposta).toLocaleDateString("pt-BR") : "", status: e.status })));

  addSheet("Contratos", [
    { header: "ID", key: "id", width: 8 },
    { header: "Número", key: "numero", width: 18 },
    { header: "Empresa", key: "empresa", width: 30 },
    { header: "Validade", key: "validade", width: 14 },
  ], contratos.map((c) => ({ id: c.id, numero: c.numero, empresa: c.empresa.razaoSocial, validade: c.dataValidade ? new Date(c.dataValidade).toLocaleDateString("pt-BR") : "" })));

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="backup-aam-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
