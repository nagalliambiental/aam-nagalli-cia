import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import ExcelJS from "exceljs";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function dataBR(s: string): Date | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], 12, 0, 0);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:criar")) {
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
  const pessoas = await prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true } });
  const empreendimentos = await prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true, apelido: true } });
  const tipoMin = await prisma.tipoProcesso.findFirst({ where: { tronco: "mineral" } });
  const tipoAmb = await prisma.tipoProcesso.findFirst({ where: { tronco: "ambiental" } });
  const orgaoMin = await prisma.orgao.findFirst({ where: { ambito: "mineral" } });
  const orgaoAmb = await prisma.orgao.findFirst({ where: { ambito: "ambiental" } });

  let criados = 0;
  let comToken = 0;
  const erros: string[] = [];

  for (let i = 2; i <= ws.rowCount; i++) {
    const r = ws.getRow(i);
    const natureza = normalizar(r.getCell(1).value).toLowerCase().startsWith("amb") ? "ambiental" : "minerario";
    let numero = normalizar(r.getCell(2).value);
    const apelido = normalizar(r.getCell(3).value) || null;
    const nup = normalizar(r.getCell(4).value).replace(/\s/g, "") || null;
    const seiUrl = normalizar(r.getCell(5).value) || null;
    const empNome = normalizar(r.getCell(6).value);
    const respNome = normalizar(r.getCell(7).value);

    if (natureza === "minerario" && !numero) { if (apelido || nup) erros.push(`Linha ${i}: sem Número.`); continue; }
    if (natureza === "ambiental" && !numero) {
      numero = normalizar(r.getCell(15).value) || normalizar(r.getCell(14).value) || `AMB-${Date.now()}-${i}`;
    }

    const dup = await prisma.processo.findFirst({ where: { numero, ativo: true, deletedAt: null }, select: { id: true } });
    if (dup) { erros.push(`Linha ${i}: Processo ${numero} já cadastrado.`); continue; }

    let empreendimentoId: number | null = null;
    if (empNome) {
      const ne = norm(empNome);
      const emp = empreendimentos.find((x) => norm(x.nome) === ne || (x.apelido && norm(x.apelido) === ne));
      if (emp) empreendimentoId = emp.id;
      else erros.push(`Linha ${i}: Empreendimento "${empNome}" não encontrado (processo sem vínculo).`);
    }
    let responsavelPessoaId: number | null = null;
    if (respNome) {
      const p = pessoas.find((x) => norm(x.nome) === norm(respNome));
      if (p) responsavelPessoaId = p.id;
    }

    try {
      const base = {
        numero, apelido, nup: nup && /^48\d{3}\.\d{6}\/\d{4}-\d{2}$/.test(nup) ? nup : null,
        seiUrl, orgaoId: (natureza === "ambiental" ? orgaoAmb?.id : orgaoMin?.id) ?? orgaoMin?.id,
        tipoProcessoId: (natureza === "ambiental" ? tipoAmb?.id : tipoMin?.id) ?? tipoMin?.id,
        empreendimentoId, responsavelPessoaId, natureza,
        status: normalizar(r.getCell(9).value) || (natureza === "ambiental" ? "ativo" : "em_andamento"),
        observacoes: normalizar(r.getCell(22).value) || null,
      };
      let data: Record<string, unknown>;
      if (natureza === "minerario") {
        data = {
          ...base,
          fase: normalizar(r.getCell(8).value) || null,
          areaValor: normalizar(r.getCell(10).value) ? Number(normalizar(r.getCell(10).value).replace(",", ".")) : null,
          areaUnidade: normalizar(r.getCell(11).value) || "ha",
          substancias: normalizar(r.getCell(12).value) || null,
          guiaUtilizacao: normalizar(r.getCell(13).value).toLowerCase().startsWith("s"),
        };
      } else {
        data = {
          ...base,
          numeroLicenca: normalizar(r.getCell(14).value) || null,
          numeroProtocolo: normalizar(r.getCell(15).value) || null,
          atividade: normalizar(r.getCell(16).value) || null,
          modalidade: normalizar(r.getCell(17).value) || null,
          orgaoAmbiental: normalizar(r.getCell(18).value) || null,
          validade: dataBR(normalizar(r.getCell(19).value)),
          dataProtocolo: dataBR(normalizar(r.getCell(20).value)),
          alertaDias: normalizar(r.getCell(21).value) ? Number(normalizar(r.getCell(21).value)) : null,
        };
      }
      const proc = await prisma.processo.create({ data: data as never });
      await audit({ tipoEntidade: "processo", entidadeId: proc.id, acao: "criar", usuarioId: Number(session.user.id), valorNovo: proc.numero });
      criados++;
      if (seiUrl && seiUrl.includes("md_pesq_processo_exibir")) comToken++;
    } catch {
      erros.push(`Linha ${i}: Erro ao criar.`);
    }
  }

  return NextResponse.json({ criados, comToken, erros });
}
