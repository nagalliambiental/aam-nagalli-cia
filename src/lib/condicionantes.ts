// Classificação automática de condicionantes extraídas da licença.
// Itens do tipo "exigência" (com obrigação/prazo) geram acompanhamento/prazos;
// itens "informativo" (apenas informação/restrição) não.

/** Divide o texto das condicionantes em itens (numerados "01." ou com marcadores "•"). */
export function dividirCondicionantes(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const limpo = texto.replace(/\r\n/g, "\n").trim();
  if (!limpo) return [];
  const partes = limpo.split(/(?=(?:^\s*\d{1,3}[.)]\s)|(?:^\s*[•·▪]\s))/m);
  return partes.map((p) => p.trim()).filter(Boolean);
}

/**
 * Classifica um item de condicionante em "exigencia" ou "informativo".
 * Conservador: só marca "exigencia" quando há verbo de obrigação/prazo;
 * frases descritivas ou de restrição ("esta licença...", "não autoriza",
 * "não será permitida") são tratadas como informativo.
 */
export function classificarCondicionante(texto: string): "exigencia" | "informativo" {
  const s = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  // Marcadores de informação/restrição (têm prioridade)
  const informativo =
    /(esta licenca|esta lo|presente licenca|a presente|a lor)/.test(s) ||
    /nao autoriza/.test(s) ||
    /nao sera permitid/.test(s) ||
    /tem a validade/.test(s) ||
    /trata-se de/.test(s) ||
    /devera ser afixada/.test(s) ||
    /^01\b/.test(s) && /(licenca|renovacao|protocolo|emissao)/.test(s) ||
    /informa|comunica|esclarece|informamos/.test(s) ||
    /devera ser publicada/.test(s) ||
    /deste documento|do presente/.test(s);
  if (informativo) return "informativo";

  // verbos de obrigação/ação/prazo
  const exigencia =
    /\bapresentar\b/.test(s) ||
    /\bapresentacao\b/.test(s) ||
    /\bdever[aa]\b/.test(s) ||
    /\bdeverao\b/.test(s) ||
    /\bprazo\s+m[aa]ximo\b/.test(s) ||
    /\bno prazo\b/.test(s) ||
    /\bcomprov|comprovacao\b/.test(s) ||
    /\bsolicitar\b/.test(s) ||
    /\bmanter\b/.test(s) ||
    /\bimplantar|implementar\b/.test(s) ||
    /\batender\b/.test(s) ||
    /\bprovidenciar\b/.test(s) ||
    /\brealizar\b/.test(s) ||
    /\bmonitora\b/.test(s) ||
    /\bfornecer\b/.test(s) ||
    /\bencaminhar\b/.test(s) ||
    /\bserao aceitos\b/.test(s) ||
    /\bobrigatori[oa]m\b/.test(s) ||
    /\bvincular\b/.test(s);
  return exigencia ? "exigencia" : "informativo";
}

/** Classifica a lista de condicionantes, retornando texto + tipo. */
export function classificarListaCondicionantes(
  texto: string | null | undefined
): { texto: string; tipo: "exigencia" | "informativo" }[] {
  return dividirCondicionantes(texto).map((item) => ({
    texto: item,
    tipo: classificarCondicionante(item),
  }));
}
