import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

function nomeEmpresa(e?: { razaoSocial: string; nomeFantasia: string | null } | null): string {
  if (!e) return "Sem vínculo";
  return e.nomeFantasia || e.razaoSocial;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("relatorio:ler")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const filtroCliente = new URL(req.url).searchParams.get("cliente");

  const custos = await prisma.custo.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { data: "desc" },
    include: {
      processo: { include: { empreendimento: { include: { empresaPrincipal: true } } } },
    },
  });

  // Agrupa por cliente (empresa dona do empreendimento do processo).
  const linhas = custos
    .filter((c) => {
      if (!filtroCliente) return true;
      const nome = nomeEmpresa(c.processo?.empreendimento?.empresaPrincipal);
      return nome.toLowerCase().includes(filtroCliente.toLowerCase());
    })
    .map((c) => ({
      Empresa: nomeEmpresa(c.processo?.empreendimento?.empresaPrincipal),
      Empreendimento: c.processo?.empreendimento?.nome ?? "—",
      Processo: c.processo ? `#${c.processo.numero}` : "—",
      Descrição: c.descricao,
      Tipo: c.tipo,
      Data: c.data ? c.data.toISOString().slice(0, 10) : "—",
      Fornecedor: c.fornecedor ?? "—",
      Status: c.status,
      Valor: Number(c.valor),
    }));

  const porCliente = new Map<string, { qtd: number; total: number }>();
  for (const l of linhas) {
    const cur = porCliente.get(l.Empresa) ?? { qtd: 0, total: 0 };
    cur.qtd += 1;
    cur.total += l.Valor;
    porCliente.set(l.Empresa, cur);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "AAM Nagalli";

  // Resumo por cliente
  const resumo = wb.addWorksheet("Resumo por cliente");
  resumo.columns = [
    { header: "Cliente", key: "cliente", width: 40 },
    { header: "Qtd. lançamentos", key: "qtd", width: 16 },
    { header: "Total (R$)", key: "total", width: 18 },
  ];
  const resumoRows = [...porCliente.entries()]
    .map(([cliente, v]) => ({ cliente, qtd: v.qtd, total: v.total }))
    .sort((a, b) => b.total - a.total);
  const grandTotal = resumoRows.reduce((s, r) => s + r.total, 0);
  resumoRows.push({ cliente: "TOTAL GERAL", qtd: resumoRows.reduce((s, r) => s + r.qtd, 0), total: grandTotal });
  resumoRows.forEach((r) => resumo.addRow(r));
  resumo.getRow(1).font = { bold: true };
  resumo.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  resumo.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  resumo.views = [{ state: "frozen", ySplit: 1 }];
  resumo.columns.forEach((col, i) => { (col as unknown as { alignment?: unknown }).alignment = { horizontal: i === 0 ? "left" : "right" }; });

  // Detalhe
  const det = wb.addWorksheet("Detalhe");
  det.columns = [
    { header: "Empresa", key: "Empresa", width: 40 },
    { header: "Empreendimento", key: "Empreendimento", width: 30 },
    { header: "Processo", key: "Processo", width: 16 },
    { header: "Descrição", key: "Descrição", width: 45 },
    { header: "Tipo", key: "Tipo", width: 14 },
    { header: "Data", key: "Data", width: 12 },
    { header: "Fornecedor", key: "Fornecedor", width: 24 },
    { header: "Status", key: "Status", width: 12 },
    { header: "Valor (R$)", key: "Valor", width: 14 },
  ];
  linhas.forEach((l) => det.addRow(l));
  det.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  det.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF021E4C" } };
  det.views = [{ state: "frozen", ySplit: 1 }];
  det.autoFilter = { from: "A1", to: { row: 1, column: det.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=gastos-por-cliente.xlsx",
    },
  });
}
