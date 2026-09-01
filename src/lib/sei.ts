// Consulta de andamentos via URL de exibição do SEI (md_pesq_processo_exibir.php?token).
// A página abre sem captcha e traz o histórico real com data + descrição por andamento.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const BASE_SEI = "https://sei.anm.gov.br";

export interface AndamentoSei {
  data: string; // dd/mm/yyyy
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
    const dm = limparHtml(tds[0] ?? "").match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!dm) continue;
    const descricao = limparHtml(tds[2] ?? "");
    if (descricao.length >= 4) out.push({ data: `${dm[1].padStart(2, "0")}/${dm[2].padStart(2, "0")}/${dm[3]}`, descricao });
  }
  return out.slice(0, 30);
}

/** Extrai a URL de exibição (md_pesq_processo_exibir.php?token) do HTML de resultado. */
export function extrairUrlExibirSei(htmlSearch: string): string | null {
  const m = htmlSearch.match(/md_pesq_processo_exibir\.php\?[A-Za-z0-9_-]{20,}/);
  return m ? `${BASE_SEI}/sei/modulos/pesquisa/${m[0]}` : null;
}

/** Busca a página de exibição do SEI e retorna os andamentos (datas reais). */
export async function consultarAndamentosSei(url: string): Promise<AndamentoSei[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return [];
  return parseAndamentosProcesso(await res.text());
}
