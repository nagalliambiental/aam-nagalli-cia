export function formatDate(d?: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

export function formatDateTime(d?: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function formatCNPJ(cnpj?: string | null) {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
}

export function formatBytes(b?: number | null) {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMoney(v?: number | string | { toString(): string } | null) {
  if (v == null) return "—";
  const n = typeof v === "object" ? Number(v.toString()) : Number(v);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function formatRelative(d?: Date | null) {
  if (!d) return { label: "—", tone: "gray" as const };
  const now = new Date();
  const target = new Date(d);
  const diffMs = target.getTime() - now.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) return { label: `há ${Math.abs(days)}d`, tone: "red" as const };
  if (days === 0) return { label: "hoje", tone: "amber" as const };
  if (days === 1) return { label: "amanhã", tone: "amber" as const };
  if (days <= 7) return { label: `em ${days}d`, tone: "blue" as const };
  return { label: `em ${days}d`, tone: "gray" as const };
}
