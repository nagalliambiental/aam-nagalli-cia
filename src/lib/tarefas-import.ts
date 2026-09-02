import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const CABECALHOS = ["Título", "Descrição", "Responsável", "Empreendimento", "Processo", "Prazo", "Alerta", "Prioridade"];

/** Gera o modelo XLSX (cabeçalhos + uma linha de exemplo). */
export async function gerarModeloTarefasXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tarefas");
  ws.addRow(CABECALHOS);
  ws.addRow([
    "Ex.: Apresentar RAL anual",
    "Descrição da tarefa",
    "Bruno Nagalli",           // Responsável (nome da pessoa cadastrada)
    "Pedreira Cordilheira Alta", // Empreendimento (nome)
    "815.310/2008",            // Processo (número ou NUP) — opcional
    "15/08/2026",              // Prazo (dd/mm/aaaa)
    30,                        // Alerta (dias antes) — padrão 30
    "media",                   // Prioridade: baixa | media | alta | urgente
  ]);
  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 40;
  [3, 4, 5, 6].forEach((c) => (ws.getColumn(c).width = 26));
  [7, 8].forEach((c) => (ws.getColumn(c).width = 14));
  ws.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function normalizar(txt: unknown): string {
  return txt == null ? "" : String(txt).trim();
}

/** Normaliza para comparação: minúsculas, sem acentos e com espaços colapsados. */
function comparar(txt: string): string {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseData(valor: unknown): Date | null {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  const s = normalizar(valor);
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Importa tarefas de um XLSX, resolvendo empreendimento/processo/responsável pelas chaves. */
export async function importarTarefasXlsx(buffer: Buffer, importId: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) return { criadas: 0, erros: [] as string[] };

  let criadas = 0;
  const erros: string[] = [];

  // Cache dos catálogos para comparação normalizada (acento/tamanho/espacos).
  const pessoas = await prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true } });
  const empreendimentos = await prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true, apelido: true } });

  // iteração simples por índice (linha 1 = cabeçalho)
  for (let i = 2; i <= ws.rowCount; i++) {
    const r = ws.getRow(i);
    const titulo = normalizar(r.getCell(1).value);
    const descricao = normalizar(r.getCell(2).value);
    const responsavelNome = normalizar(r.getCell(3).value);
    const empreendimentoNome = normalizar(r.getCell(4).value);
    const processoChave = normalizar(r.getCell(5).value);
    const prazo = parseData(r.getCell(6).value);
    const alerta = r.getCell(7).value != null && r.getCell(7).value !== "" ? Number(r.getCell(7).value) : 30;
    const prioridade = normalizar(r.getCell(8).value) || "media";

    if (!titulo) continue; // linha em branco
    if (!responsavelNome) { erros.push(`Linha ${i}: título "${titulo}" sem Responsável.`); continue; }

    const pessoa = pessoas.find((p) => comparar(p.nome) === comparar(responsavelNome));
    if (!pessoa) { erros.push(`Linha ${i}: Responsável "${responsavelNome}" não encontrado.`); continue; }

    // Empreendimento
    let empreendimentoId: number | null = null;
    if (empreendimentoNome) {
      const ne = comparar(empreendimentoNome);
      const emp =
        empreendimentos.find((x) => x.apelido && comparar(x.apelido) === ne) ||
        empreendimentos.find((x) => comparar(x.nome) === ne);
      if (!emp) { erros.push(`Linha ${i}: Empreendimento "${empreendimentoNome}" não encontrado.`); continue; }
      empreendimentoId = emp.id;
    }

    // Processo (opcional) — prioriza dentro do empreendimento
    let processo: { id: number; orgaoId: number } | null = null;
    if (processoChave) {
      const onde = {
        ativo: true, deletedAt: null,
        ...(empreendimentoId ? { empreendimentoId } : {}),
        OR: [{ nup: processoChave }, { numero: processoChave }],
      };
      processo = await prisma.processo.findFirst({ where: onde, select: { id: true, orgaoId: true } });
      if (!processo) { erros.push(`Linha ${i}: Processo "${processoChave}" não encontrado.`); continue; }
    }

    // Cria a tarefa (+ exigência se houver processo)
    let exigenciaId: number | null = null;
    if (processo) {
      const ex = await prisma.exigencia.create({
        data: {
          processoId: processo.id,
          orgaoId: processo.orgaoId,
          descricao: descricao ? `${titulo}: ${descricao}` : titulo,
          prazoResposta: prazo,
          alertaDias: isNaN(alerta) ? 30 : alerta,
          status: "pendente",
          responsavelPessoaId: pessoa.id,
        },
      });
      exigenciaId = ex.id;
    }

    await prisma.tarefa.create({
      data: {
        titulo,
        descricao: descricao || null,
        processoId: processo?.id ?? null,
        empreendimentoId,
        exigenciaId,
        responsavelPessoaId: pessoa.id,
        prioridade,
        status: "pendente",
        prazoData: prazo,
        alertaDias: isNaN(alerta) ? 30 : alerta,
        importId,
      },
    });
    criadas++;
  }

  return { criadas, erros };
}
