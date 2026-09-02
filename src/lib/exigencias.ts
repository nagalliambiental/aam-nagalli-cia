/**
 * Separa uma exigência que contém dois termos unidos por " e " em duas
 * exigências independentes (ex.: "CFEM e PFM" -> "CFEM" + "PFM").
 * A descrição é dividida no mesmo " e " quando possível, pareando com os termos.
 */
export function separarExigencias(nome: string, descricao: string): { nome: string; descricao: string }[] {
  const partesNome = nome
    .split(/\s+e\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (partesNome.length < 2) return [{ nome: nome.trim(), descricao: descricao ?? "" }];

  const partesDesc = (descricao ?? "")
    .split(/\s+e\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return partesNome.map((n, i) => ({
    nome: n,
    descricao: partesDesc[i] ?? descricao ?? "",
  }));
}
