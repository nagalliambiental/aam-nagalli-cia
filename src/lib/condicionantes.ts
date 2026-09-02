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
 * Regra do usuário: exigência é quando se deve apresentar/fazer algo (em um
 * prazo específico). Conservador: sem ação/prazo claro, trata como informativo.
 */
export function classificarCondicionante(texto: string): "exigencia" | "informativo" {
  const s = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

  // Indicador de prazo/periodicidade (forte sinal de exigência)
  const temPrazo =
    /\bno prazo\b/.test(s) ||
    /\bprazo (maximo|de |de até|de ate|para|fixado)\b/.test(s) ||
    /\bem ate\b/.test(s) ||
    /\bdentro de\b/.test(s) ||
    /\bno maximo\b/.test(s) ||
    /\bate\s+\d{1,3}\s+(dia|mes|meses|ano|anos)\b/.test(s) ||
    /\b\d{1,3}\s*(dia|dias|mes|meses|ano|anos)\b/.test(s) ||
    /\b(trimensal|trimenais|trimestral|trimestrais|semestral|semestrais|bimestral|bimestrais|mensal|mensais|quinzenal|quinzenais|semanal|semanais|anual|anuais|diario|diaria|diarias)\b/.test(s) ||
    /\bperiodicidade\b|\bcronograma\b|\bcampanha\b|\bcampanhas\b/.test(s) ||
    /\bantes de\b/.test(s) ||
    /\bpor ocasi[ao]\b/.test(s);

  // Verbo de ação obrigatória
  const verboAcao =
    /\bapresentar\b|\bapresentacao\b|\benviar\b|\bencaminhar\b|\bentregar\b|\bfornecer\b|\bcomprovar\b|\bcomprovacao\b|\bprotocolar\b|\bsolicitar\b|\brequerer\b|\brealizar\b|\belaborar\b|\bexecutar\b|\bmanter\b|\bimplantar\b|\bimplementar\b|\bmonitorar\b|\bmonitoramento\b|\batender\b|\bcumprir\b|\bprovidenciar\b|\bobter\b|\bdestinar\b|\bpublicar\b|\bafixar\b|\butilizar\b|\bsinalizar\b|\brecuperar\b|\bdepositar\b|\bgarantir\b|\baderir\b|\binstalar\b|\bdesenvolver\b|\bimplantacao\b|\bexecucao\b|\bprestar\b|\bpagar\b|\brecolher\b|\bsubmeter\b|\bacompanhad[oa]s?\b|\bcampanhas?\b/.test(s);

  // Frases descritivas da licença / restrições (não exigem ação com prazo)
  const informativo =
    /esta licenca|esta lo|presente licenca|a presente|desta licenca|deste documento|do presente/.test(s) ||
    /trata-se de/.test(s) ||
    /nao autoriza/.test(s) ||
    /nao sera permitid/.test(s) ||
    /nao podera/.test(s) ||
    /tem a validade/.test(s) ||
    /informamos?|comunica|esclarece|ressalta-se|destaca-se/.test(s) ||
    /\brefere-se\b/.test(s);

  // Informativo só quando é frase descritiva E NÃO tem prazo/ação obrigatória
  if (informativo && !temPrazo) return "informativo";

  // Exigência: há ação obrigatória E/OU prazo
  if (temPrazo || verboAcao) return "exigencia";

  return "informativo";
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
