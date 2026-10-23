export type FiltroLoteBruto = { q?: string; tipo?: string; status?: string };

export type WhereLote = Record<string, unknown>;

/**
 * Espelha os filtros das listagens server-side nos módulos de cadastro,
 * para a exclusão em lote de "todos os registros".
 */
export function whereLote(modulo: string, bruto: FiltroLoteBruto | undefined): WhereLote | null {
  const q = (bruto?.q ?? "").toString().trim();
  const tipo = (bruto?.tipo ?? "").toString().trim().toLowerCase();

  switch (modulo) {
    case "empresa": {
      const where: Record<string, unknown> = { ativo: true, deletedAt: null };
      if (tipo === "pj") where.tipoPessoa = "juridica";
      if (tipo === "pf") where.tipoPessoa = "fisica";
      if (q) {
        where.OR = [
          { razaoSocial: { contains: q, mode: "insensitive" } },
          { nomeFantasia: { contains: q, mode: "insensitive" } },
          { apelido: { contains: q, mode: "insensitive" } },
          { cnpj: { contains: q, mode: "insensitive" } },
          { cpf: { contains: q, mode: "insensitive" } },
          { municipio: { contains: q, mode: "insensitive" } },
          { bairro: { contains: q, mode: "insensitive" } },
          { complemento: { contains: q, mode: "insensitive" } },
          ...(q.replace(/\D/g, "") ? [{ cnpj: { contains: q.replace(/\D/g, "") } }, { cpf: { contains: q.replace(/\D/g, "") } }] : []),
        ];
      }
      return where;
    }
    case "empreendimento": {
      const where: Record<string, unknown> = { ativo: true, deletedAt: null };
      if (q) {
        where.OR = [
          { nome: { contains: q, mode: "insensitive" } },
          { apelido: { contains: q, mode: "insensitive" } },
          { municipio: { contains: q, mode: "insensitive" } },
          { tipo: { contains: q, mode: "insensitive" } },
        ];
      }
      return where;
    }
    case "area": {
      const where: Record<string, unknown> = { ativo: true, deletedAt: null };
      if (q) {
        where.OR = [
          { nome: { contains: q, mode: "insensitive" } },
          { municipio: { contains: q, mode: "insensitive" } },
          { tipo: { contains: q, mode: "insensitive" } },
        ];
      }
      return where;
    }
    case "orgao": {
      const where: Record<string, unknown> = { ativo: true };
      if (q) {
        where.OR = [
          { sigla: { contains: q, mode: "insensitive" } },
          { nome: { contains: q, mode: "insensitive" } },
        ];
      }
      return where;
    }
    case "titulo": {
      const where: Record<string, unknown> = { ativo: true, deletedAt: null };
      if (q) {
        where.OR = [
          { numero: { contains: q, mode: "insensitive" } },
          { substancia: { contains: q, mode: "insensitive" } },
          { municipio: { contains: q, mode: "insensitive" } },
        ];
      }
      return where;
    }
    case "licenca": {
      const where: Record<string, unknown> = { ativo: true, deletedAt: null };
      if (q) where.numero = { contains: q, mode: "insensitive" };
      return where;
    }
    case "contrato": {
      const where: Record<string, unknown> = { ativo: true, deletedAt: null };
      if (q) {
        where.OR = [
          { numero: { contains: q, mode: "insensitive" } },
          { descricao: { contains: q, mode: "insensitive" } },
        ];
      }
      return where;
    }
    case "fatura":
      return { ativo: true, deletedAt: null };
    default:
      return null;
  }
}
