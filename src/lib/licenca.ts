import { consultarCnpj } from "@/lib/cnpj";

/** Regex que invalida endereços formatados por terem sido unificados em texto. */
function montarEndereco(d: {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}): string {
  return [
    [d.logradouro, d.numero].filter(Boolean).join(", "),
    d.complemento,
    d.bairro,
    [d.municipio, d.uf].filter(Boolean).join("/"),
    d.cep,
  ]
    .filter(Boolean)
    .join(", ");
}

export interface DadosLicenca {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  licenca: string;
  protocolo: string;
  modalidade: string;
  atividade: string;
  municipio: string;
  uf: string;
  validade: string;
  emissao: string;
  orgao: string;
}

const BASE_SGA = "http://www.sga.pr.gov.br/sga-iap/consultarProcessoLicenciamento.do";
const BASE_IMA = "https://consultas.ima.sc.gov.br/consulta";

const SIGLA_MODALIDADE: Record<string, string> = {
  AA: "Autorização Ambiental",
  AF: "Autorização Florestal",
  LP: "Licença Prévia",
  LI: "Licença de Instalação",
  LO: "Licença de Operação",
  LAS: "Licença Ambiental Simplificada",
  LAC: "Licença Ambiental por Adesão e Compromisso",
  RLO: "Renovação de Licença de Operação",
  RLI: "Renovação de Licença de Instalação",
  RLAS: "Renovação de Licença Ambiental Simplificada",
  LOR: "Licença de Operação de Regularização",
  LASR: "Licença Ambiental Simplificada de Regularização",
  DLAE: "Declaração de Dispensa de Licenciamento Ambiental",
  DLAM: "Dispensa de Licenciamento Ambiental",
  CP: "Consulta Prévia",
};

interface ItemSga {
  numProtocolo?: number;
  numDocumento?: number;
  numDocumentoFormatado?: string;
  numProtocoloFormatado?: string;
  siglaModalidade?: string;
  descAtividade?: string;
  descAtividadeEspecifica?: string;
  dtDecisaoFormatado?: string;
  dtValidadeFormatado?: string;
  nomeRazaoSocial?: string;
  nomeMunicipio?: string;
  siglaUf?: string;
  cpfCnpj?: string;
  indSia?: boolean;
}

// ---------------------------------------------------------------------------
// IAT / SGA
// ---------------------------------------------------------------------------

async function consultarSga(licenca?: string): Promise<ItemSga[]> {
  const qs = new URLSearchParams({ action: "consultarProcessoLicenciamento" });
  if (licenca) qs.set("numDocumento", licenca.replace(/\D/g, ""));

  const res = await fetch(`${BASE_SGA}?${qs.toString()}`, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`SGA respondeu ${res.status}`);

  const texto = new TextDecoder("iso-8859-1").decode(await res.arrayBuffer());
  const jsonTexto = texto
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"');

  let json: { listaProcessoLicenciamento?: ItemSga[] };
  try {
    json = JSON.parse(jsonTexto);
  } catch {
    return [];
  }
  return json?.listaProcessoLicenciamento ?? [];
}

export async function consultarLicencaIat(opts: { licenca?: string }): Promise<DadosLicenca[] | null> {
  const itens = await consultarSga(opts.licenca);
  if (itens.length === 0) return null;

  const resultados: DadosLicenca[] = [];
  for (const item of itens.slice(0, 10)) {
    const cnpj = item.cpfCnpj || "";
    let endereco = "";
    if (cnpj) {
      try {
        const emp = await consultarCnpj(cnpj);
        if (emp) endereco = montarEndereco(emp);
      } catch {
        // endereço vazio se a consulta CNPJ falhar
      }
    }
    resultados.push({
      razaoSocial: item.nomeRazaoSocial || "",
      cnpj,
      endereco,
      licenca: item.numDocumentoFormatado || String(item.numDocumento ?? ""),
      protocolo: item.numProtocoloFormatado || String(item.numProtocolo ?? ""),
      modalidade: SIGLA_MODALIDADE[item.siglaModalidade || ""] || item.siglaModalidade || "",
      atividade: item.descAtividadeEspecifica || item.descAtividade || "",
      municipio: item.nomeMunicipio || "",
      uf: item.siglaUf || "",
      validade: item.dtValidadeFormatado || "",
      emissao: item.dtDecisaoFormatado || "",
      orgao: "IAT — Instituto Água e Terra",
    });
  }
  return resultados;
}

// ---------------------------------------------------------------------------
// IMA / SC
// ---------------------------------------------------------------------------

interface ItemIma {
  fce?: string;
  razaoSocial?: string;
  cnpj?: string;
  atividadeConsema?: string;
  dtEntrada?: string;
  numeroDocumento?: string;
  municipio?: string;
  fce_processo_tipo?: string;
}

interface DetalheIma {
  modalidade?: string;
  validade?: string;
  endereco?: string;
  municipio?: string;
}

function limparTexto(t: string): string {
  return t.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

async function consultarResultadoIma(opts: { licenca?: string; protocolo?: string }): Promise<ItemIma[]> {
  const body = new URLSearchParams({
    protocolo: (opts.protocolo || "").replace(/\D/g, ""),
    documento: opts.licenca?.trim() || "",
    cnpj: "",
    razaoSocial: "",
    municipio: "",
    bairro: "",
    logradouro: "",
    "g-recaptcha-response": "",
  });
  const res = await fetch(`${BASE_IMA}/consultar`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });
  if (!res.ok) throw new Error(`IMA respondeu ${res.status}`);
  const dados = (await res.json()) as ItemIma[];
  return Array.isArray(dados) ? dados : [];
}

async function buscarDetalheIma(fce: string, tipo: string, numeroDocumento: string): Promise<DetalheIma | null> {
  const numero = numeroDocumento.replace(/\//g, "-");
  const url = `${BASE_IMA}/visualizar/${encodeURIComponent(fce)}/${encodeURIComponent(tipo)}/${encodeURIComponent(numero)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const campo = (rotulo: string): string => {
    const esc = rotulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m =
      html.match(new RegExp(`<dt[^>]*>\\s*${esc}:?\\s*</dt>\\s*<dd[^>]*>(.*?)</dd>`, "s")) ||
      html.match(new RegExp(`<strong>\\s*${esc}:?\\s*</strong>\\s*([^<]+)`, "s"));
    return m ? limparTexto(m[1].replace(/<[^>]+>/g, "")) : "";
  };

  const titulo = html.match(/<h3>([^<]+)<\/h3>/);
  return {
    modalidade: titulo ? limparTexto(titulo[1].replace(/\s*Nº?\s*[0-9]+\/.*$/i, "")) : "",
    validade: campo("Validade"),
    endereco: [campo("Endereço"), campo("Bairro"), campo("Município")].filter(Boolean).join(", "),
    municipio: campo("Município"),
  };
}

export async function consultarLicencaIma(opts: { licenca?: string; protocolo?: string }): Promise<DadosLicenca[] | null> {
  const itens = await consultarResultadoIma(opts);
  if (itens.length === 0) return null;

  const resultados: DadosLicenca[] = [];
  for (const item of itens.slice(0, 10)) {
    const fce = item.fce || "";
    const tipo = item.fce_processo_tipo || "";
    const numeroDocumento = item.numeroDocumento || "";

    let detalhe: DetalheIma | null = null;
    if (fce && tipo && numeroDocumento && numeroDocumento !== "-") {
      try {
        detalhe = await buscarDetalheIma(fce, tipo, numeroDocumento);
      } catch {
        detalhe = null;
      }
    }

    let endereco = detalhe?.endereco || "";
    const cnpj = item.cnpj || "";
    if (!endereco && cnpj) {
      try {
        const emp = await consultarCnpj(cnpj);
        if (emp) endereco = montarEndereco(emp);
      } catch {
        // endereço vazio
      }
    }

    resultados.push({
      razaoSocial: item.razaoSocial || "",
      cnpj,
      endereco,
      licenca: numeroDocumento,
      protocolo: fce,
      modalidade: detalhe?.modalidade || "",
      atividade: item.atividadeConsema || "",
      municipio: detalhe?.municipio || item.municipio || "",
      uf: "SC",
      validade: detalhe?.validade || "",
      emissao: item.dtEntrada || "",
      orgao: "IMA — Instituto do Meio Ambiente de Santa Catarina",
    });
  }
  return resultados;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export type OrigemLicenca = "IAT" | "IMA";

export interface LicencaImportada {
  origem: OrigemLicenca;
  orgaoSigla: string;
  sistema: string;
  modalidade: string;
  validade: string;
  atividade: string;
  municipio: string;
  uf: string;
  protocolo: string;
  licenca: string;
  emissao: string;
  razaoSocial: string;
}

function fromOrgao(d: DadosLicenca, origem: OrigemLicenca): LicencaImportada {
  return {
    origem,
    orgaoSigla: origem,
    sistema: origem === "IAT" ? "SGA" : "IMA",
    modalidade: d.modalidade,
    validade: d.validade,
    atividade: d.atividade,
    municipio: d.municipio,
    uf: d.uf,
    protocolo: d.protocolo,
    licenca: d.licenca,
    emissao: d.emissao,
    razaoSocial: d.razaoSocial,
  };
}

const ORGAOS_MUNICIPAIS = /^(SMMA|SMA|SEMAM|SMAM|SEMMA)$/i;

export async function importarLicencaDoOrgao(opts: {
  licenca?: string;
  protocolo?: string;
  orgaoSigla?: string;
}): Promise<LicencaImportada | null> {
  const licenca = opts.licenca?.trim() || "";
  const protocolo = (opts.protocolo || "").replace(/\D/g, "");
  const sigla = (opts.orgaoSigla || "").toUpperCase();
  if (!licenca && !protocolo) return null;
  if (ORGAOS_MUNICIPAIS.test(sigla)) return null;

  const ehIma = /IMA/.test(sigla);
  const ehIat = /IAT|IAP/.test(sigla);

  if (ehIma) {
    const r = await consultarLicencaIma(licenca ? { licenca } : { protocolo }).catch(() => null);
    return r?.[0] ? fromOrgao(r[0], "IMA") : null;
  }
  if (ehIat) {
    const r = await consultarLicencaIat({ licenca }).catch(() => null);
    return r?.[0] ? fromOrgao(r[0], "IAT") : null;
  }

  // Sem definição explícita: tenta os dois, priorizando IAT para números doc e IMA para protocolo/barra.
  const ordem = licenca.includes("/") ? ["IMA", "IAT"] : ["IAT", "IMA"];
  for (const origem of ordem) {
    const r =
      origem === "IMA"
        ? await consultarLicencaIma(licenca ? { licenca } : { protocolo }).catch(() => null)
        : await consultarLicencaIat({ licenca }).catch(() => null);
    if (r?.[0]) return fromOrgao(r[0], origem as OrigemLicenca);
  }
  return null;
}
