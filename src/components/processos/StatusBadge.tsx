import { Badge } from "@/components/ui";

const MAP: Record<string, "green" | "red" | "amber" | "blue" | "gray" | "gold"> = {
  em_andamento: "blue",
  ativo: "green",
  ativa: "green",
  pendente: "amber",
  vencido: "red",
  concluido: "green",
  arquivado: "gray",
  cancelado: "red",
  encerrado: "gray",
  futuro: "blue",
  proximo: "amber",
  vencendo: "gold",
  proximo_vencimento: "amber",
  em_renovacao: "blue",
};

const LABEL: Record<string, string> = {
  em_andamento: "Em andamento",
  ativo: "Ativo",
  ativa: "Ativa",
  pendente: "Pendente",
  vencido: "Vencido",
  concluido: "Concluído",
  arquivado: "Arquivado",
  cancelado: "Cancelado",
  encerrado: "Encerrado",
  futuro: "Futuro",
  proximo: "Próximo",
  vencendo: "Vencendo hoje",
  proximo_vencimento: "Próximo do vencimento",
  em_renovacao: "Em Renovação",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={MAP[status] ?? "gray"}>{LABEL[status] ?? status}</Badge>;
}
