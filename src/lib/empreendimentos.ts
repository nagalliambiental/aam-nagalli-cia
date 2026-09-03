export const TIPOS_EMPREENDIMENTO: { value: string; label: string }[] = [
  { value: "pedreira", label: "Pedreira" },
  { value: "usina_asfalto", label: "Usina de Asfalto" },
  { value: "usina_concreto", label: "Usina de Concreto" },
  { value: "saibreira", label: "Saibreira" },
  { value: "areial", label: "Areial" },
  { value: "outro", label: "Outro" },
];

/** Rótulo amigável do tipo (ou o próprio valor se for um tipo manual). */
export function labelTipoEmpreendimento(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return TIPOS_EMPREENDIMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}
