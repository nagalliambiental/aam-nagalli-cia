export const DIAS_PARA_RENOVACAO = 120;

export type StatusAmbiental = "ativo" | "proximo_vencimento" | "vencido" | "em_renovacao";

const UM_DIA = 1000 * 60 * 60 * 24;

/**
 * Data limite para renovação: usa a data informada (dataLimiteRenovacao) ou,
 * se vazia, calcula automaticamente como data de protocolo + 120 dias.
 */
export function dataLimiteRenovacao(
  dataLimite?: Date | string | null,
  dataProtocolo?: Date | string | null
): Date | null {
  if (dataLimite) return new Date(dataLimite);
  if (dataProtocolo) return new Date(new Date(dataProtocolo).getTime() + DIAS_PARA_RENOVACAO * UM_DIA);
  return null;
}

/**
 * Status do processo AMBIENTAL (exato, sem rótulo de dias):
 * - Ativo (padrão)
 * - Próximo do Vencimento: quando hoje já alcançou a data limite de renovação
 *   (dataLimiteRenovacao ou dataProtocolo + 120 dias)
 * - Vencido: depois da validade
 * - Em Renovação: flag manual
 */
export function statusAmbiental(
  validade: Date | null | undefined,
  statusSalvo: string | null | undefined,
  dataLimite?: Date | null,
  dataProtocolo?: Date | null,
  agora: Date = new Date()
): string {
  if (statusSalvo === "em_renovacao") return "em_renovacao";
  if (statusSalvo && ["cancelado", "arquivado", "encerrado"].includes(statusSalvo)) return statusSalvo;
  if (validade && agora.getTime() > new Date(validade).getTime()) return "vencido";

  const limite = dataLimiteRenovacao(dataLimite, dataProtocolo);
  if (limite && agora.getTime() >= limite.getTime()) return "proximo_vencimento";

  return statusSalvo === "ativo" || !statusSalvo ? "ativo" : statusSalvo;
}
