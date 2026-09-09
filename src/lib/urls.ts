export function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  const candidates = value.toLowerCase().startsWith("javascript:")
    ? [
        ...(value.match(/(?:https?:\/\/|\/)[^'"\s)]+/gi) ?? []),
        ...(value.match(/["']([^"']+\.php\?[^"']+)["']/i)?.slice(1) ?? []),
      ]
    : [value];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, "https://sei.anm.gov.br");
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {}
  }
  return null;
}
