import { prisma } from "@/lib/prisma";
import { formatDate, formatDocumento } from "@/lib/format";
import { statusAmbiental } from "@/lib/status";

export type RelatorioGerencialTipo =
  | "clientes"
  | "empreendimentos"
  | "processos-minerarios"
  | "processos-ambientais"
  | "prazos";

export type RelatorioFiltro = { status?: string; dias?: string };

export type RelatorioGerencial = {
  titulo: string;
  colunas: { label: string; key: string }[];
  linhas: string[][];
};

const STATUS_TODOS = ["ativo", "em_andamento", "paralisado", "encerrado", "morto"];

export async function buscarRelatorioGerencial(tipo: RelatorioGerencialTipo, filtro: RelatorioFiltro = {}): Promise<RelatorioGerencial> {
  switch (tipo) {
    case "clientes": {
      const data = await prisma.empresa.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { razaoSocial: "asc" },
        include: { contatos: { where: { ativo: true, deletedAt: null } } },
      });
      return {
        titulo: "Clientes",
        colunas: ["Nome", "Tipo", "CPF/CNPJ", "Município/UF", "Contatos"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas: data.map((c) => [
          c.nomeFantasia || c.razaoSocial,
          (c as { tipoPessoa?: string }).tipoPessoa === "fisica" ? "Pessoa Física" : "Pessoa Jurídica",
          formatDocumento(c as { tipoPessoa?: string | null; cnpj?: string | null; cpf?: string | null }),
          c.municipio && c.uf ? `${c.municipio}/${c.uf}` : "—",
          c.contatos.map((x) => x.nome).filter(Boolean).join(", ") || "—",
        ]),
      };
    }
    case "empreendimentos": {
      const data = await prisma.empreendimento.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { nome: "asc" },
        include: { empresaPrincipal: true },
      });
      return {
        titulo: "Empreendimentos",
        colunas: ["Nome", "Tipo", "Cliente", "Município/UF"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas: data.map((e) => [
          e.nome,
          e.tipo,
          e.empresaPrincipal.nomeFantasia || e.empresaPrincipal.razaoSocial,
          e.municipio && e.uf ? `${e.municipio}/${e.uf}` : "—",
        ]),
      };
    }
    case "processos-minerarios": {
      const data = await prisma.processo.findMany({
        where: { ativo: true, deletedAt: null, natureza: "minerario" },
        orderBy: { numero: "asc" },
        include: { orgao: true, empreendimento: true },
      });
      const linhas = data
        .filter((p) => (filtro.status ? p.status === filtro.status : true))
        .map((p) => [
          p.numero,
          p.orgao.sigla,
          p.fase || "—",
          p.empreendimento ? (p.empreendimento.apelido || p.empreendimento.nome) : "—",
          p.areaValor != null ? `${p.areaValor} ${p.areaUnidade}` : "—",
          p.status,
        ]);
      return {
        titulo: "Processos Minerários",
        colunas: ["Nº", "Órgão", "Fase", "Empreendimento", "Área", "Status"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas,
      };
    }
    case "processos-ambientais": {
      const data = await prisma.processo.findMany({
        where: { ativo: true, deletedAt: null, natureza: "ambiental" },
        orderBy: { apelido: "asc" },
        include: { orgao: true, empreendimento: true },
      });
      const linhas = data
        .map((p) => ({ p, status: statusAmbiental(p.validade, p.status, p.dataLimiteRenovacao, p.dataProtocolo) }))
        .filter((x) => (filtro.status ? x.status === filtro.status : true))
        .map(({ p, status }) => [
          `${p.apelido || "—"} / ${p.numeroLicenca || "—"}`,
          p.orgao.sigla,
          p.empreendimento ? (p.empreendimento.apelido || p.empreendimento.nome) : "—",
          formatDate(p.validade),
          status,
        ]);
      return {
        titulo: "Processos Ambientais",
        colunas: ["Apelido / Nº da Licença", "Órgão", "Empreendimento", "Validade", "Status"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas,
      };
    }
    case "prazos": {
      const data = await prisma.prazo.findMany({
        where: { ativo: true, deletedAt: null, status: { notIn: ["concluido", "cancelado"] }, dataCalculadaAtual: { not: null }, processo: { ativo: true, deletedAt: null } },
        orderBy: { dataCalculadaAtual: "asc" },
        include: { processo: { include: { orgao: true } } },
      });
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const linhas = data
        .filter((p) => {
          if (!filtro.dias || filtro.dias === "todos") return true;
          if (filtro.dias === "vencidos") {
            return p.dataCalculadaAtual ? new Date(p.dataCalculadaAtual) < now : false;
          }
          const dias = Number(filtro.dias);
          if (!Number.isFinite(dias)) return true;
          const limite = new Date(now.getTime() + dias * 86400000);
          return p.dataCalculadaAtual ? new Date(p.dataCalculadaAtual) >= now && new Date(p.dataCalculadaAtual) <= limite : false;
        })
        .map((p) => [
          p.descricao,
          p.processo ? `#${p.processo.numero} (${p.processo.orgao.sigla})` : "—",
          p.status,
          formatDate(p.dataCalculadaAtual),
        ]);
      return {
        titulo: "Prazos",
        colunas: ["Descrição", "Processo", "Status", "Data Calculada"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas,
      };
    }
  }
}
