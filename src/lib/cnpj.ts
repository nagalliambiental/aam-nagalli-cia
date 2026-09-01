export interface DadosEmpresaCnpj {
  razaoSocial: string;
  nomeFantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
}

interface FonteCnpj {
  razao_social?: string;
  nome_fantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  uf?: string;
  nome?: string;
  fantasia?: string;
  atividade_principal?: { text?: string }[];
}

async function tentarFonte(url: string): Promise<FonteCnpj | null> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return null;
  const d = (await res.json()) as FonteCnpj;
  if (!d || (!d.razao_social && !d.nome)) return null;
  return d;
}

/** Consulta dados da empresa pelo CNPJ (BrasilAPI / minhareceita / receitaws, tentando em ordem). */
export async function consultarCnpj(cnpj: string): Promise<DadosEmpresaCnpj | null> {
  const limpo = cnpj.replace(/\D/g, "");
  if (limpo.length !== 14) return null;

  const fontes = [
    `https://brasilapi.com.br/api/cnpj/v1/${limpo}`,
    `https://minhareceita.org/${limpo}`,
    `https://www.receitaws.com.br/v1/cnpj/${limpo}`,
  ];
  for (const url of fontes) {
    const d = await tentarFonte(url).catch(() => null);
    if (d) {
      return {
        razaoSocial: d.razao_social || d.nome || "",
        nomeFantasia: d.nome_fantasia || d.fantasia || "",
        logradouro: d.logradouro || "",
        numero: d.numero || "",
        complemento: d.complemento || "",
        bairro: d.bairro || "",
        cep: d.cep || "",
        municipio: d.municipio || "",
        uf: d.uf || "",
      };
    }
  }
  return null;
}
