export function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  const candidates = value.toLowerCase().startsWith("javascript:")
    ? [
        ...(value.match(/(?:https?:\/\/|\/)[^'"\s)]+/gi) ?? []),
        ...(value.match(/["']([^"']+\.php\?[^"']+)["']/i)?.slice(1) ?? []),
        ...(value.match(/(?:md_pesq_[a-z_]+\.php\?)[^'"\s)]+/i) ?? []),
      ]
    : [value];
  for (const candidate of candidates) {
    try {
      const caminho = candidate.includes(".php?") && !candidate.startsWith("/") && !candidate.startsWith("http")
        ? `/sei/modulos/pesquisa/${candidate}`
        : candidate;
      const url = new URL(caminho, "https://sei.anm.gov.br");
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {}
  }
  return null;
}
