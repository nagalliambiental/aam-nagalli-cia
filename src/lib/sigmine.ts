const SIGMINE_URL =
  "https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/FeatureServer/0/query";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
export type SigEvento = {
  evento: string;       // código + texto do último evento (ex.: "1939 - TRANSF DIREITOS - CISÃO AVERBADA EM 31/03/2026")
  descricao: string;    // descrição limpa
  data: Date | null;    // data real extraída do texto
};

/** Extrai data dd/mm/aaaa e limpa a descrição de um evento SIGMINE (ULT_EVENTO). */
export function parseUltimoEvento(raw: string | null | undefined): SigEvento | null {
  if (!raw) return null;
  const m = raw.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  let data: Date | null = null;
  if (m) {
    data = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  const descricao = raw.replace(/^\d+\s*-\s*/, "").replace(/\s{2,}/g, " ").trim();
  return { evento: raw, descricao, data };
}

/** Consulta o SIGMINE (dados abertos da ANM) para um processo, retornando o último evento. */
export async function consultarSigmineEvento(numero: string): Promise<SigEvento | null> {
  const m = numero.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m) return null;
  const NUMERO = m[1] + m[2];
  const ANO = m[3];
  const params = new URLSearchParams({
    where: `NUMERO=${NUMERO} AND ANO=${ANO}`,
    outFields: "NUMERO,ANO,ULT_EVENTO,DSProcesso",
    returnGeometry: "false",
    f: "json",
    resultRecordCount: "1",
  });
  const res = await fetch(`${SIGMINE_URL}?${params}`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { attributes?: Record<string, unknown> }[] };
  const attrs = data.features?.[0]?.attributes;
  if (!attrs) return null;
  const ultimo = attrs.ULT_EVENTO;
  if (typeof ultimo !== "string" || !ultimo) return null;
  return parseUltimoEvento(ultimo);
}
