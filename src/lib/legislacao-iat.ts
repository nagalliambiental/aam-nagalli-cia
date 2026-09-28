import { createHash } from "crypto";

export const FONTE_LEGISLACAO_IAT = "https://www.iat.pr.gov.br/Pagina/Instrucoes-Normativas-Orientacoes-Tecnicas";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const SENTINELA = "\u0001";

export type LegislacaoIatItem = {
  tipo: "IN" | "OT";
  numero: number;
  ano: number;
  titulo: string;
  ementa: string;
  url: string | null;
  anexosUrl: string | null;
  situacao: "vigente" | "revogada";
  revogadaPor: string | null;
  hash: string;
};

function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&cedil;|&ccedil;/gi, "ç")
    .replace(/&atilde;|&aacute;|&eacute;|&iacute;|&oacute;|&uacute;|&uuml;|&auml;|&euml;|&iuml;|&ouml;/gi, "")
    .replace(/\u00a0/g, " ");
}

function absolutizar(href: string): string | null {
  const limpo = href.trim();
  if (!limpo || limpo.startsWith("#") || limpo.startsWith("javascript:")) return null;
  if (/^https?:\/\//i.test(limpo)) return limpo;
  if (limpo.startsWith("/")) return `https://www.iat.pr.gov.br${limpo}`;
  return `https://www.iat.pr.gov.br/${limpo}`;
}

/**
 * Converte o HTML da página do IAT em linhas de texto, preservando os hrefs
 * dos links com o marcador "⟦URL⟧" logo após o texto do link.
 */
function htmlParaLinhas(html: string): string[] {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  s = s.replace(
    /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, hrefDuplo: string | undefined, hrefSimples: string | undefined, texto: string) => {
      const href = hrefDuplo ?? hrefSimples ?? "";
      const limpo = texto.replace(/<[^>]+>/g, " ");
      return `${limpo}⟦${href}⟧`;
    },
  );

  s = s
    .replace(/<\s*(?:p|div|li|h[1-6]|tr|td|th|ul|ol|table|section|article|blockquote|dl|dt|dd)\b[^>]*>/gi, SENTINELA)
    .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|tr|td|th|ul|ol|table|section|article|blockquote|dl|dt|dd)\s*>/gi, SENTINELA)
    .replace(/<\s*br\s*\/?\s*>/gi, SENTINELA)
    .replace(/<\s*hr\s*\/?\s*>/gi, SENTINELA)
    .replace(/<[^>]+>/g, " ");

  s = decodificarEntidades(s).replace(/\s+/g, " ");
  return s
    .split(SENTINELA)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

/** Extrai a área de conteúdo da página (fora do menu/rodapé). */
function recortarConteudo(html: string): string {
  const inicio = html.indexOf("field--name-field-texto");
  const fim = html.indexOf('id="main-footer"');
  if (inicio >= 0 && fim > inicio) return html.slice(inicio, fim);
  return html;
}

function calcularHash(item: Omit<LegislacaoIatItem, "hash">): string {
  const base = [item.tipo, item.numero, item.ano, item.titulo, item.ementa, item.url ?? "", item.anexosUrl ?? "", item.situacao, item.revogadaPor ?? ""].join("|");
  return createHash("sha1").update(base).digest("hex");
}

export async function baixarPaginaLegislacaoIat(): Promise<string> {
  const res = await fetch(FONTE_LEGISLACAO_IAT, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "pt-BR,pt;q=0.9" },
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Site do IAT respondeu ${res.status}`);
  return await res.text();
}

/**
 * Faz o parse da página de Instruções Normativas / Orientações Técnicas do IAT.
 * Cada norma aparece em um parágrafo: título (às vezes link para o PDF) + " - " + ementa.
 * Normas revogadas aparecem sem link e com "(REVOGADA pela IN n. XX/AAAA)".
 */
export function parseLegislacaoIat(html: string): LegislacaoIatItem[] {
  const conteudo = recortarConteudo(html);
  const linhas = htmlParaLinhas(conteudo);

  const regexNorma = /^(Instru[çc][ãa]o Normativa|Orienta[çc][ãa]o T[ée]cnica|IN|OT)\s*n\.?\s*(\d{1,3})\s*\/\s*(\d{4})/i;
  const itens: LegislacaoIatItem[] = [];
  let ultimoItem: LegislacaoIatItem | null = null;

  for (const linha of linhas) {
    // Parágrafo "Anexos" logo após a norma (link separado).
    if (/^Anexos\b/i.test(linha) && ultimoItem) {
      const marca = linha.match(/⟦([^⟩]*)⟧/);
      const anexo = marca ? absolutizar(marca[1]) : null;
      if (anexo) {
        ultimoItem.anexosUrl = anexo;
        ultimoItem.hash = calcularHash(ultimoItem);
      }
      continue;
    }

    const m = linha.match(regexNorma);
    if (!m) continue;

    const sigla = m[1].toLowerCase();
    const tipo: "IN" | "OT" = sigla.startsWith("o") || sigla.startsWith("orienta") ? "OT" : "IN";
    const numero = Number(m[2]);
    const ano = Number(m[3]);
    if (!numero || !ano) continue;

    const titulo = `${tipo === "IN" ? "Instrução Normativa" : "Orientação Técnica"} n. ${String(numero).padStart(2, "0")}/${ano}`;

    let resto = linha.slice(m[0].length);
    const marcaUrl = resto.match(/⟦([^⟩]*)⟧/);
    const url = marcaUrl ? absolutizar(marcaUrl[1]) : null;
    if (marcaUrl) resto = resto.replace(/⟦[^⟩]*⟧/g, " ");

    resto = resto.replace(/\s+/g, " ").trim();
    resto = resto.replace(/^[-–—]\s*/, "").trim();

    // Revogação: "(REVOGADA pela IN n. 26/2026)" ou apenas " - Revogada" no fim.
    const rev =
      resto.match(/\(\s*REVOGAD[AO]\s+pela\s+([^)]+)\)/i) ??
      resto.match(/\bREVOGAD[AO]\s+pela\s+(.+?)(?:\)|$)/i);
    const revogadaPor = rev ? rev[1].trim().replace(/\s+/g, " ") : null;
    const marcadorRevogado = /\(\s*REVOGAD[AO]/i.test(resto) || /\s[-–—]\s*Revogad[ao]\s*$/i.test(resto);

    const ementa = resto
      .replace(/\s*\(?\s*REVOGAD[AO]\s+pela\s+[^)]+\)?/gi, " ")
      .replace(/\s*[-–—]\s*Revogad[ao]\s*$/i, "")
      .replace(/\s+/g, " ")
      .replace(/[\s\-–—]+$/, "")
      .trim();

    if (!ementa && !url) continue;

    const item: Omit<LegislacaoIatItem, "hash"> = {
      tipo,
      numero,
      ano,
      titulo,
      ementa,
      url,
      anexosUrl: null,
      situacao: revogadaPor || marcadorRevogado ? "revogada" : "vigente",
      revogadaPor,
    };
    itens.push({ ...item, hash: calcularHash(item) });
    ultimoItem = itens[itens.length - 1];
  }

  // Deduplica por [tipo, numero, ano] mantendo a PRIMEIRA ocorrência:
  // o site às vezes repete a norma (com typo de ano) em grupos antigos.
  const mapa = new Map<string, LegislacaoIatItem>();
  for (const item of itens) {
    const chave = `${item.tipo}-${item.numero}-${item.ano}`;
    if (!mapa.has(chave)) mapa.set(chave, item);
  }

  return [...mapa.values()];
}

export async function buscarLegislacaoIat(): Promise<LegislacaoIatItem[]> {
  const html = await baixarPaginaLegislacaoIat();
  const itens = parseLegislacaoIat(html);
  if (itens.length === 0) throw new Error("Nenhuma norma encontrada na página do IAT (estrutura pode ter mudado).");
  return itens;
}

/** Extrai "YYYY-MM" da pasta do arquivo no site (mês de publicação/envio no IAT). */
export function extrairDataPublicacao(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/(\d{4})-(\d{2})\/[^/]+$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function dataDoPdf(texto: string): Date | null {
  for (const campo of ["CreationDate", "ModDate"]) {
    const m = texto.match(new RegExp(`/${campo}\\s*\\(D:(\\d{4})(\\d{2})(\\d{2})`));
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }
  return null;
}

async function baixarPartePdf(url: string, range: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/pdf", Range: range },
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PDF do IAT respondeu ${res.status}`);
  return (Buffer.from(await res.arrayBuffer())).toString("latin1");
}

/**
 * Lê a data do ato no PDF da norma (metadado CreationDate/ModDate).
 * Começa pelo fim do arquivo (xref/Info costuma estar lá), depois o início
 * e, por último, o arquivo completo — evita baixar tudo sempre.
 * Lança erro em falha de rede/status para a chamada decidir se tenta depois.
 */
export async function buscarDataAtoPdf(url: string): Promise<Date | null> {
  const tentativas = ["bytes=-65536", "bytes=0-131071", "bytes=0-"];
  for (const range of tentativas) {
    const texto = await baixarPartePdf(url, range);
    const data = dataDoPdf(texto);
    if (data) return data;
    if (range === "bytes=0-") return null;
  }
  return null;
}
