// Consulta de andamentos via URL de exibição do SEI (md_pesq_processo_exibir.php?token).
// A página abre sem captcha e traz o histórico real com data + descrição por andamento.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const BASE_SEI = "https://sei.anm.gov.br";

export interface AndamentoSei {
  data: string; // dd/mm/yyyy
  hora: string; // hh:mm (vazio quando ausente)
  unidade: string;
  descricao: string;
}

export interface ProtocoloSei {
  numero: string;
  tipo: string;
  data: string;
  dataInclusao: string;
  unidade: string;
  url: string | null;
}

function limparHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function extrairUrlPublica(href: string | null): string | null {
  if (!href) return null;
  const normalizado = href.replace(/&amp;/g, "&");
  const candidatos = [
    ...(normalizado.match(/(?:https?:\/\/|\/)[^'"\s)]+/gi) ?? []),
    ...(normalizado.match(/["']([^"']+\.php\?[^"']+)["']/i)?.slice(1) ?? []),
    ...(normalizado.match(/(?:md_pesq_[a-z_]+\.php\?)[^'"\s)]+/i) ?? []),
  ];
  for (const candidato of candidatos) {
    try {
      const caminho = candidato.includes(".php?") && !candidato.startsWith("/") && !candidato.startsWith("http")
        ? `/sei/modulos/pesquisa/${candidato}`
        : candidato;
      const url = new URL(caminho, BASE_SEI);
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {}
  }
  return null;
}

/**
 * Converte o HTML da página de exibição do processo em andamentos.
 * Cada linha <tr class="andamento..."> tem: data/hora, unidade e descrição.
 */
export function parseAndamentosProcesso(htmlHtml: string): AndamentoSei[] {
  const rows = htmlHtml.match(/<tr[^>]*class="[^"]*andamento[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const out: AndamentoSei[] = [];
  for (const row of rows) {
    const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
    if (tds.length < 3) continue;
    const dataHora = limparHtml(tds[0] ?? "");
    const dm = dataHora.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!dm) continue;
    const hora = (dataHora.match(/\b(\d{1,2}:\d{2})\b/)?.[1]) ?? "";
    const descricao = limparHtml(tds[2] ?? "");
    if (descricao.length >= 4) {
      out.push({
        data: `${dm[1].padStart(2, "0")}/${dm[2].padStart(2, "0")}/${dm[3]}`,
        hora,
        unidade: limparHtml(tds[1] ?? ""),
        descricao,
      });
    }
  }
  return out;
}

/** Extrai a tabela "Lista de Protocolos" da página pública do processo. */
export function parseProtocolosProcesso(htmlHtml: string): ProtocoloSei[] {
  const rows = htmlHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const out: ProtocoloSei[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? [];
    if (tds.length < 6) continue;
    const cells = tds.map((td) => limparHtml(td));
    const numero = cells[1]?.match(/\b\d{5,}\b/)?.[0] ?? "";
    if (!numero || seen.has(numero) || !/\d{1,2}\/\d{1,2}\/\d{4}/.test(cells[3] ?? "")) continue;
    const linkSource = tds[1]?.match(/(?:href|onclick)=["']([^"']+)["']/i)?.[1] ?? row.match(/md_pesq_documento_consulta_externa\.php\?[^'"\s)]+/i)?.[0] ?? null;
    const url = extrairUrlPublica(linkSource);
    seen.add(numero);
    out.push({
      numero,
      tipo: cells[2] ?? "",
      data: cells[3] ?? "",
      dataInclusao: cells[4] ?? "",
      unidade: cells[5] ?? "",
      url,
    });
  }
  return out;
}

/** Extrai TODAS as URLs de exibição (md_pesq_processo_exibir.php?token) do HTML de resultado. */
export function extrairUrlsExibirSei(htmlSearch: string): string[] {
  const set = new Set<string>();
  const re = /md_pesq_processo_exibir\.php\?[A-Za-z0-9_-]{20,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(htmlSearch)) !== null) {
    set.add(`${BASE_SEI}/sei/modulos/pesquisa/${m[0]}`);
  }
  return [...set];
}

/**
 * Encontra o processo da "Gestão de Título" cujo NUP (primeiro "nº...") bate com o
 * do sistema. O SEI lista vários itens relacionados; o correto é o que tem o NUP
 * no título — usamos o PRIMEIRO "nº<numero>" de cada item para não confundir com
 * NUPs citados no corpo de outros itens.
 */
export function extrairUrlExibirPorNup(htmlSearch: string, chave: string): string | null {
  const chaveDigits = normalizarNup(chave);
  if (chaveDigits.length < 17) return null;

  const re = /md_pesq_processo_exibir\.php\?[A-Za-z0-9_-]{20,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(htmlSearch)) !== null) {
    const janela = htmlSearch.slice(Math.max(0, m.index - 800), m.index + 800);
    const texto = limparHtml(janela);
    const primeiroNup = texto.match(/n[º°o]?\s*([0-9][0-9\.\/\-]{10,})/i);
    if (primeiroNup && normalizarNup(primeiroNup[1]) === chaveDigits) {
      return `${BASE_SEI}/sei/modulos/pesquisa/${m[0]}`;
    }
  }
  return null;
}

/** Extrai os DÍGITOS do NUP do processo que a página de exibição representa (ex.: "Processo: 48411.815240/2017-52"). */
export function extrairNupProcessoSei(html: string): string | null {
  const m = limparHtml(html).match(/Processo:\s*([0-9][0-9\.\/\-]{10,})/);
  return m ? m[1].replace(/\D/g, "") : null;
}

function normalizarNup(nup: string): string {
  return nup.replace(/\D/g, "");
}

/** Consulta a página do processo e retorna os andamentos + o NUP da página. */
export async function consultarPaginaSei(url: string): Promise<{ andamentos: AndamentoSei[]; protocolos: ProtocoloSei[]; nup: string | null }> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return { andamentos: [], protocolos: [], nup: null };
  const html = new TextDecoder("iso-8859-1").decode(await res.arrayBuffer());
  return { andamentos: parseAndamentosProcesso(html), protocolos: parseProtocolosProcesso(html), nup: extrairNupProcessoSei(html) };
}

/**
 * Busca a página de exibição do SEI e retorna os andamentos (datas reais).
 * A página usa charset ISO-8859-1 — decodifica para preservar os acentos.
 */
export async function consultarAndamentosSei(url: string): Promise<AndamentoSei[]> {
  return (await consultarPaginaSei(url)).andamentos;
}

/** Confere se o NUP (dígitos) da página bate com a chave procurada. Sem extração => não confirma. */
export function nupConfere(chave: string, nupPaginaDigitos: string | null): boolean {
  if (!nupPaginaDigitos) return false; // não conseguiu extrair → não aceita como confirmado
  const chaveDigits = normalizarNup(chave);
  // Se a chave for um NUP completo, exige igualdade (tolerante a formatação).
  // Se for só o número curto, não dá para casar; aceita (usa o primeiro com andamentos).
  return chaveDigits.length >= 17 ? chaveDigits === nupPaginaDigitos : true;
}
