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

export interface SigmineGeo {
  processo: string; // formato SIGMINE, sem ponto: "815310/2008"
  dscProcesso: string;
  fase: string;
  titular: string;
  substancia: string;
  uso: string;
  areaHa: number | null;
  uf: string;
  ultimoEvento: string;
  extent: { xmin: number; ymin: number; xmax: number; ymax: number } | null;
  aneis: number[][][] | null;
}

function extrairNumeroAno(numero: string): { numero: string; ano: string } | null {
  const m = numero.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m) return null;
  return { numero: m[1] + m[2], ano: m[3] };
}

/** Consulta o SIGMINE (dados abertos da ANM) para um processo, retornando atributos + extensão do polígono. */
export async function consultarSigmineGeo(numero: string): Promise<SigmineGeo | null> {
  const partes = extrairNumeroAno(numero);
  if (!partes) return null;
  const params = new URLSearchParams({
    where: `NUMERO=${partes.numero} AND ANO=${partes.ano}`,
    outFields: "PROCESSO,NUMERO,ANO,FASE,NOME,SUBS,USO,AREA_HA,UF,ULT_EVENTO,DSProcesso",
    returnGeometry: "true",
    outSR: "4326",
    geometryPrecision: "5",
    resultRecordCount: "1",
    f: "json",
  });
  const res = await fetch(`${SIGMINE_URL}?${params}`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { attributes?: Record<string, unknown>; geometry?: { rings?: number[][][] } }[];
  };
  const feature = data.features?.[0];
  const attrs = feature?.attributes;
  if (!attrs) return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  let extent: SigmineGeo["extent"] = null;
  const rings = feature?.geometry?.rings;
  if (rings) {
    let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
    for (const ring of rings) {
      for (const pt of ring) {
        if (pt[0] < xmin) xmin = pt[0];
        if (pt[1] < ymin) ymin = pt[1];
        if (pt[0] > xmax) xmax = pt[0];
        if (pt[1] > ymax) ymax = pt[1];
      }
    }
    if (isFinite(xmin)) {
      const padX = Math.max((xmax - xmin) * 0.25, 0.01);
      const padY = Math.max((ymax - ymin) * 0.25, 0.01);
      extent = { xmin: xmin - padX, ymin: ymin - padY, xmax: xmax + padX, ymax: ymax + padY };
    }
  }
  const area = attrs.AREA_HA;
  return {
    processo: str(attrs.PROCESSO) || `${partes.numero}/${partes.ano}`,
    dscProcesso: str(attrs.DSProcesso),
    fase: str(attrs.FASE),
    titular: str(attrs.NOME),
    substancia: str(attrs.SUBS),
    uso: str(attrs.USO),
    areaHa: typeof area === "number" ? area : null,
    uf: str(attrs.UF),
    ultimoEvento: str(attrs.ULT_EVENTO),
    extent,
    aneis: rings ?? null,
  };
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
