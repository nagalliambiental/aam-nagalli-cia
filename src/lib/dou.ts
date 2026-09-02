// Consulta de publicações no Diário Oficial da União (DOU) pela API da
// Imprensa Nacional — a mesma usada pelo in.gov.br/consulta e pelo Ro-DOU.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const URL_BUSCA = "https://www.in.gov.br/consulta/-/buscar/dou";
const URL_ARTIGO = "https://www.in.gov.br/web/dou/-/";

export interface DouResultado {
  id: string; // classPK
  secao: string; // DO1, DO2, DO3
  titulo: string;
  url: string;
  conteudo: string;
  data: string; // dd/mm/yyyy
}

const SCRIPT_ID = "script[id='_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params']";

/** Busca publicações do DOU que contenham o termo exato, na data DD-MM-AAAA. */
export async function buscarDouTermo(termo: string, dataDmy: string): Promise<DouResultado[]> {
  const params = new URLSearchParams();
  params.set("q", `"${termo}"`);
  params.set("exactDate", "personalizado");
  params.set("publishFrom", dataDmy);
  params.set("publishTo", dataDmy);
  params.set("sortType", "0");
  params.append("s", "do1");
  params.append("s", "do2");
  params.append("s", "do3");

  const res = await fetch(`${URL_BUSCA}?${params.toString()}`, {
    cache: "no-store",
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return [];
  const html = await res.text();

  const m = html.match(
    /<script[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m) return [];
  let json: { jsonArray?: any[] };
  try {
    json = JSON.parse(m[1]);
  } catch {
    return [];
  }
  return (json.jsonArray ?? []).map((it) => ({
    id: it.classPK ?? "",
    secao: it.pubName ?? "",
    titulo: it.title ?? "",
    url: URL_ARTIGO + (it.urlTitle ?? ""),
    conteudo: it.content ?? "",
    data: it.pubDate ?? "",
  }));
}

/** Data de ontem em Brasília, no formato DD-MM-AAAA. */
export function dataOntemDmy(): string {
  const d = new Date();
  const dtf = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
  const [dd, mm, yyyy] = dtf.format(new Date(d.getTime() - 24 * 60 * 60 * 1000)).split("/");
  return `${dd}-${mm}-${yyyy}`;
}
