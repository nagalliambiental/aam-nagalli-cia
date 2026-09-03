export const DIAS_ANTES_VENCIMENTO = 200;
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
/**
 * Status do processo AMBIENTAL:
 * - Ativo (padrão)
 * - Próximo do Vencimento: automático quando faltam ≤ 200 dias para a validade
 * - Vencido: depois da validade
 * - Em Renovação / Encerrado: definidos manualmente no formulário
 */
export function statusAmbiental(
  validade: Date | null | undefined,
  statusSalvo: string | null | undefined,
  _dataLimite?: Date | null,
  _dataProtocolo?: Date | null,
  agora: Date = new Date()
): string {
  if (statusSalvo === "em_renovacao") return "em_renovacao";
  if (statusSalvo && ["cancelado", "arquivado", "encerrado"].includes(statusSalvo)) return statusSalvo;
  if (validade) {
    const v = new Date(validade).getTime();
    if (agora.getTime() > v) return "vencido";
    if ((v - agora.getTime()) / (1000 * 60 * 60 * 24) <= DIAS_ANTES_VENCIMENTO) return "proximo_vencimento";
  }
  return "ativo";
}
