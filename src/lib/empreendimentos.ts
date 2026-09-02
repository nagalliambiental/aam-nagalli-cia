export const TIPOS_EMPREENDIMENTO: { value: string; label: string }[] = [
  { value: "pedreira", label: "Pedreira" },
  { value: "mina_ceu_aberto", label: "Mina a céu aberto" },
  { value: "mina_subterranea", label: "Mina subterrânea" },
  { value: "garimpo", label: "Garimpo (lavra garimpeira)" },
  { value: "areia", label: "Areial / Areia e cascalho" },
  { value: "saibreira", label: "Saibreira" },
  { value: "argila", label: "Olaría / Extração de argila" },
  { value: "britagem", label: "Britagem / Usina de beneficiamento" },
  { value: "outro", label: "Outro" },
];

/** Rótulo amigável do tipo (ou o próprio valor se for um tipo manual). */
export function labelTipoEmpreendimento(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return TIPOS_EMPREENDIMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}
