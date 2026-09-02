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

function limparHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
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
export async function consultarPaginaSei(url: string): Promise<{ andamentos: AndamentoSei[]; nup: string | null }> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return { andamentos: [], nup: null };
  const html = new TextDecoder("iso-8859-1").decode(await res.arrayBuffer());
  return { andamentos: parseAndamentosProcesso(html), nup: extrairNupProcessoSei(html) };
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
