import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export type RelatorioGerencialTipo = "processos" | "prazos" | "tarefas" | "exigencias" | "condicionantes";

export type RelatorioGerencial = {
  titulo: string;
  colunas: { label: string; key: string }[];
  linhas: string[][];
};

export async function buscarRelatorioGerencial(tipo: RelatorioGerencialTipo): Promise<RelatorioGerencial> {
  switch (tipo) {
    case "processos": {
      const data = await prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { dataAbertura: "desc" }, include: { orgao: true, tipoProcesso: true, empreendimento: true } });
      return {
        titulo: "Processos",
        colunas: ["Nº", "Apelido / Nº da Licença", "Órgão", "Tipo", "Status", "Abertura"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas: data.map((p) => [p.numero, p.natureza === "ambiental" ? `${p.apelido || "—"} / ${p.numeroLicenca || "—"}` : (p.apelido || "—"), p.orgao.sigla, p.tipoProcesso.nome, p.status, formatDate(p.dataAbertura)]),
      };
    }
    case "prazos": {
      const data = await prisma.prazo.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { dataCalculadaAtual: "asc" }, include: { processo: true } });
      return {
        titulo: "Prazos",
        colunas: ["Descrição", "Processo", "Status", "Data Calculada"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas: data.map((p) => [p.descricao, p.processo?.numero ?? "—", p.status, formatDate(p.dataCalculadaAtual)]),
      };
    }
    case "tarefas": {
      const data = await prisma.tarefa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { prazoData: "asc" }, include: { responsavel: true, processo: true } });
      return {
        titulo: "Atividades",
        colunas: ["Título", "Status", "Prazo", "Responsável", "Processo"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas: data.map((t) => [t.titulo, t.status, formatDate(t.prazoData), t.responsavel?.nome ?? "—", t.processo?.numero ?? "—"]),
      };
    }
    case "exigencias": {
      const data = await prisma.exigencia.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { dataRecebimento: "desc" }, include: { processo: true, orgao: true } });
      return {
        titulo: "Pendências",
        colunas: ["Descrição", "Status", "Prazo Resposta", "Órgão", "Processo"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas: data.map((e) => [e.descricao, e.status, formatDate(e.prazoResposta), e.orgao.sigla, e.processo.numero]),
      };
    }
    case "condicionantes": {
      const data = await prisma.condicionante.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { proximoVencimento: "asc" }, include: { licenca: true } });
      return {
        titulo: "Condicionantes",
        colunas: ["Código", "Descrição", "Status", "Próximo Vencimento", "Licença"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas: data.map((c) => [c.codigo ?? "—", c.descricao, c.status, formatDate(c.proximoVencimento), c.licenca?.numero ?? "—"]),
      };
    }
  }
}
