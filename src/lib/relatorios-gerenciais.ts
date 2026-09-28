import { prisma } from "@/lib/prisma";
import { formatDate, formatDocumento } from "@/lib/format";
import { statusAmbiental } from "@/lib/status";

export type RelatorioGerencialTipo =
  | "clientes"
  | "empreendimentos"
  | "processos-minerarios"
  | "processos-ambientais"
  | "prazos";

export type RelatorioFiltro = { status?: string; dias?: string; clienteId?: string };

export type RelatorioGerencial = {
  titulo: string;
  colunas: { label: string; key: string }[];
  linhas: string[][];
};

const STATUS_TODOS = ["ativo", "em_andamento", "paralisado", "encerrado", "morto"];

function clienteSelecionado(filtro: RelatorioFiltro): number | null {
  const bruto = String(filtro.clienteId ?? "").trim();
  if (!bruto) return null;
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Cliente pode estar ligado ao processo direto (ProcessoEmpresa), pelo
// empreendimento principal ou por vínculo secundário do empreendimento.
function filtroProcessoPorCliente(clienteId: number | null) {
  if (!clienteId) return {};
  return {
    OR: [
      { empreendimento: { empresaPrincipalId: clienteId } },
      { empreendimento: { empresas: { some: { empresaId: clienteId } } } },
      { empresas: { some: { empresaId: clienteId } } },
    ],
  };
}

export async function buscarRelatorioGerencial(tipo: RelatorioGerencialTipo, filtro: RelatorioFiltro = {}): Promise<RelatorioGerencial> {
  const clienteId = clienteSelecionado(filtro);
  const cliente = clienteId
    ? await prisma.empresa.findUnique({ where: { id: clienteId }, select: { nomeFantasia: true, razaoSocial: true } })
    : null;
  const sufixoCliente = cliente ? ` — ${cliente.nomeFantasia || cliente.razaoSocial}` : "";
  switch (tipo) {
    case "clientes": {
      const data = await prisma.empresa.findMany({
        where: { ativo: true, deletedAt: null, ...(clienteId ? { id: clienteId } : {}) },
        orderBy: { razaoSocial: "asc" },
        include: { contatos: { where: { ativo: true, deletedAt: null } } },
      });
      return {
        titulo: `Clientes${sufixoCliente}`,
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
        where: {
          ativo: true,
          deletedAt: null,
          ...(clienteId
            ? { OR: [{ empresaPrincipalId: clienteId }, { empresas: { some: { empresaId: clienteId } } }] }
            : {}),
        },
        orderBy: { nome: "asc" },
        include: { empresaPrincipal: true },
      });
      return {
        titulo: `Empreendimentos${sufixoCliente}`,
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
        where: { ativo: true, deletedAt: null, natureza: "minerario", ...filtroProcessoPorCliente(clienteId) },
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
        titulo: `Processos Minerários${sufixoCliente}`,
        colunas: ["Nº", "Órgão", "Fase", "Empreendimento", "Área", "Status"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas,
      };
    }
    case "processos-ambientais": {
      const data = await prisma.processo.findMany({
        where: { ativo: true, deletedAt: null, natureza: "ambiental", ...filtroProcessoPorCliente(clienteId) },
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
        titulo: `Processos Ambientais${sufixoCliente}`,
        colunas: ["Apelido / Nº da Licença", "Órgão", "Empreendimento", "Validade", "Status"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas,
      };
    }
    case "prazos": {
      const data = await prisma.prazo.findMany({
        where: {
          ativo: true,
          deletedAt: null,
          status: { notIn: ["concluido", "cancelado"] },
          dataCalculadaAtual: { not: null },
          processo: { ativo: true, deletedAt: null, ...filtroProcessoPorCliente(clienteId) },
        },
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
        titulo: `Prazos${sufixoCliente}`,
        colunas: ["Descrição", "Processo", "Status", "Data Calculada"].map((label, index) => ({ label, key: `coluna${index}` })),
        linhas,
      };
    }
  }
}
