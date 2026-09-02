// Extração de campos e condicionantes a partir do documento da licença.
// PDF com texto selecionável usa pdf-parse; imagens/PDFs escaneados usam a API
// ocr.space (opcional, via OCR_API_KEY — fallback melhor esforço).

const OCR_API = "https://api.ocr.space/parse/image";
const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  tiff: "image/tiff",
  tif: "image/tiff",
  bmp: "image/bmp",
};

export interface CamposLicencaExtraidos {
  numeroLicenca: string | null;
  numeroProtocolo: string | null;
  dataProtocolo: string | null; // yyyy-mm-dd
  validade: string | null; // yyyy-mm-dd
  modalidade: string | null;
  atividade: string | null;
  municipio: string | null;
  orgaoSigla: string | null;
  razaoSocial: string | null;
  condicionantes: string | null;
}

function limpar(t: string): string {
  return t.replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").trim();
}

async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  try {
    const mod = await import("pdf-parse");
    const pdf =
      (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ??
      (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
    const data = await pdf(buffer);
    return data.text ?? "";
  } catch {
    return "";
  }
}

async function extrairOcr(buffer: Buffer, ext: string): Promise<string> {
  const apiKey = process.env.OCR_API_KEY || "helloworld";
  const base64 = `data:${MIME[ext] || "application/pdf"};base64,${buffer.toString("base64")}`;
  const form = new FormData();
  form.append("base64Image", base64);
  form.append("apikey", apiKey);
  form.append("language", "por");
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");
  form.append("scale", "true");
  form.append("detectOrientation", "true");
  form.append("isTable", "true");
  const res = await fetch(OCR_API, { method: "POST", body: form }).catch(() => null);
  if (!res || !res.ok) return "";
  const json = (await res.json().catch(() => null)) as {
    IsErroredOnProcessing?: boolean;
    ParsedResults?: { ParsedText?: string }[];
  } | null;
  if (!json || json.IsErroredOnProcessing) return "";
  return json.ParsedResults?.map((r) => r.ParsedText || "").join("\n") || "";
}

export async function extrairTextoDoArquivo(buffer: Buffer, ext: string): Promise<string> {
  const limparTextoOcr = (t: string) =>
    t.replace(/^\s*(?:P[aá]gina\s+)?\d{1,4}\s*\/\s*\d{1,4}\s*$/gm, "")
      .replace(/^\s*\d{1,4}\s*$/gm, "")
      .replace(/([a-záàâãéêíóôõúç])\n([a-záàâãéêíóôõúç])/g, "$1 $2")
      .replace(/\n{3,}/g, "\n\n");
  if (ext === "pdf") {
    const texto = await extrairTextoPdf(buffer);
    if (texto.replace(/\s+/g, "").length >= 30) return limparTextoOcr(texto);
    const ocr = await extrairOcr(buffer, ext);
    return limparTextoOcr(ocr || texto);
  }
  const ocr = await extrairOcr(buffer, ext);
  return limparTextoOcr(ocr);
}

function detectarOrgao(texto: string): string | null {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("instituto agua e terra") || t.includes("instituto ambiental do parana") || /\biat\b|\biap\b/.test(t)) return "IAT";
  if (t.includes("instituto do meio ambiente") || t.includes("instituto de meio ambiente") || /\bima\b/.test(t)) return "IMA";
  if (t.includes("secretaria municipal") || t.includes("prefeitura municipal")) return "SMMA";
  if (t.includes("ibama")) return "IBAMA";
  if (t.includes("fepam")) return "FEPAM";
  if (t.includes("cetesb")) return "CETESB";
  return null;
}

function extrairModalidade(texto: string): string | null {
  const padroes = [
    /(renova[çc][ãa]o\s+da\s+licen[çc]a\s+de\s+opera[çc][ãa]o)/i,
    /(licen[çc]a\s+pr[ée]via)/i,
    /(licen[çc]a\s+de\s+instala[çc][ãa]o)/i,
    /(licen[çc]a\s+de\s+opera[çc][ãa]o)/i,
    /(autoriza[çc][ãa]o\s+ambiental\s+para\s+corte)/i,
    /(autoriza[çc][ãa]o\s+ambiental\s+para\s+obra)/i,
    /(dispensa\s+de\s+(?:licen[çc]a|outorga))/i,
  ];
  for (const p of padroes) {
    const m = texto.match(p);
    if (m && m[1].trim().length > 3) return limpar(m[1]);
  }
  return null;
}

function extrairData(texto: string, padroes: RegExp[]): string | null {
  for (const p of padroes) {
    const m = texto.match(p);
    if (m) {
      const [, d, mo, y] = m;
      const dia = parseInt(d, 10);
      const mes = parseInt(mo, 10);
      const ano = parseInt(y, 10);
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
        return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }
  }
  return null;
}

function extrairNumeroLicenca(texto: string): string | null {
  const padroes = [
    /(?:licen[çc]a|autoriza[çc][ãa]o|outorga)\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
    /n[º°o]\s*(?:da\s+)?licen[çc]a[:\s]*([\d\/\.\-]+)/i,
    /n[úu]mero\s+do\s+documento[\n\r\s]*([\d]{3,})/i,
  ];
  for (const p of padroes) {
    const m = texto.match(p);
    if (m && m[1].trim().length > 2) {
      const raw = m[1].trim();
      if (!/^\d+$/.test(raw.replace(/[\/\-\.]/g, ""))) continue;
      return raw;
    }
  }
  return null;
}

function extrairProtocolo(texto: string): string | null {
  const padroes = [
    /n[úu]mero\s+do\s+protocolo[^\d]*?([\d][\d\.\/\-]{4,})/i,
    /protocolo\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
    /processo(?:\s+administrativo)?\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  ];
  for (const p of padroes) {
    const m = texto.match(p);
    if (m && m[1].trim().length > 2) return m[1].trim();
  }
  return null;
}

function extrairAtividade(texto: string): string | null {
  const m = texto.match(/atividade(?:\s+principal)?[:\s]*([^\n]{5,120})/i) || texto.match(/atividade[:\s]*\n?\s*([^\n]{5,120})/i);
  return m ? limpar(m[1]) : null;
}

function extrairMunicipio(texto: string): string | null {
  const m = texto.match(/(?:prefeitura municipal de|secretaria de meio ambiente de)[ \t]+([A-ZÀ-Ü][A-Za-záàâãéêíóôõúç]+)/i);
  return m ? m[1].trim() : null;
}

function extrairRazaoSocial(texto: string): string | null {
  const m = texto.match(/(?:razao social|raz[aã]o social|empresa|empreendedor)[:\s]*([^\n]{3,90})/i);
  return m ? limpar(m[1]) : null;
}

const INICIOS_SECAO = [
  /CONDICIONANTES\s+AMBIENTAIS?\b[^\n]*/i,
  /CONDICIONANTES\s+D[AE]\s+(?:LICEN[ÇC]A|AUTORIZA[ÇC][ÃA]O|OUTORGA)[^\n]*/i,
  /LISTA\s+DE\s+CONDICIONANTES\b[^\n]*/i,
  /QUADRO\s+DE\s+CONDICIONANTES\b[^\n]*/i,
  /CONDICIONANTES?\b[^\n]*/i,
  /CONDI[ÇC][ÕO]ES\s+E\s+RESTRI[ÇC][ÕO]ES\b[^\n]*/i,
  /CONDI[ÇC][ÕO]ES\s+ESPEC[ÍI]FICAS\b[^\n]*/i,
  /CONDI[ÇC][ÕO]ES\s+GERAIS\b[^\n]*/i,
  /CL[ÁA]USULAS?\b[^\n]*/i,
  /OBRIGA[ÇC][ÕO]ES?\b[^\n]*/i,
];

const FINS_SECAO = [
  /DADOS\s+(?:DO|DA|DOS|DAS)\b[^\n]*/i,
  /ANEXOS?\b[^\n]*/i,
  /ASSINATURAS?\b[^\n]*/i,
  /LOCAL\s+E\s+DATA\b[^\n]*/i,
  /ASSINADO\b[^\n]*/i,
  /RESPONS[ÁA]VEL\s+T[ÉE]CNICO\b[^\n]*/i,
  /P[aá]gina\s+\d+/i,
];

function extrairSecaoCondicionantes(texto: string): string | null {
  let inicio = -1;
  for (const re of INICIOS_SECAO) {
    const m = texto.match(re);
    if (m && m.index !== undefined) {
      const pos = m.index + m[0].length;
      if (inicio === -1 || pos < inicio) inicio = pos;
    }
  }
  if (inicio === -1) return null;

  let fim = texto.length;
  for (const re of FINS_SECAO) {
    const m = texto.slice(inicio).match(re);
    if (m && m.index !== undefined) {
      const pos = inicio + m.index;
      if (pos > inicio && pos < fim) fim = pos;
    }
  }
  let secao = texto.slice(inicio, fim);
  secao = secao.replace(/^\s*(?:P[aá]gina\s+\d+(?:\/\d+)?|\d{1,4})\s*$/gm, "");
  secao = secao.replace(/https?:\/\/\S+/gi, "");
  secao = secao.replace(/^\s*C[OÓD]IGO\s+DE\s+BARRAS[^\n]*$/gim, "");
  secao = secao
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l)
    .filter((l) => !/^\d{2}\/\d{2}\/\d{4}\s*$/.test(l))
    .join("\n")
    .trim();
  return secao.length >= 20 ? secao : null;
}

export async function analisarLicenca(buffer: Buffer, ext: string): Promise<CamposLicencaExtraidos> {
  const texto = await extrairTextoDoArquivo(buffer, ext);
  const orgaoSigla = detectarOrgao(texto);
  return {
    numeroLicenca: extrairNumeroLicenca(texto),
    numeroProtocolo: extrairProtocolo(texto),
    dataProtocolo: extrairData(texto, [
      /data\s+de\s+protocolo[:\s]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /data\s+do\s+protocolo[:\s]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /protocolad[oa]\s+em[:\s]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /protocolo\s+em[:\s]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /data\s+de\s+(?:emiss[aã]o|entrada|publica[çc][ãa]o)[:\s]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /protocol(?:o|ado)\s+em[:\s]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
    ]),
    validade: extrairData(texto, [
      /validad[ea]\s*[:\.]?\s*(?:at[eé])?\s*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /v[aá]lid[oa]\s+(?:at[eé]|ao)\s*[:\.]?\s*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /[sv]alidade\s*[:\.]?\s*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
      /at[eé]\s+(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i,
    ]),
    modalidade: extrairModalidade(texto),
    atividade: extrairAtividade(texto),
    municipio: extrairMunicipio(texto),
    orgaoSigla,
    razaoSocial: extrairRazaoSocial(texto),
    condicionantes: extrairSecaoCondicionantes(texto),
  };
}
