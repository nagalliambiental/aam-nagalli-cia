import { Card, CardHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/processos/StatusBadge";
import { PrazoStatusButton } from "@/components/processos/PrazoStatusButton";

type PrazoItem = {
  id: number;
  processoId: number;
  descricao: string;
  tipo: string | null;
  status: string;
  dataInicial: Date;
  dataCalculadaAtual: Date | null;
  dataEfetiva: Date | null;
};

export function PrazosPanel({ prazos }: { prazos: PrazoItem[] }) {
  return (
    <Card>
      <CardHeader title="Prazos" />
      <ul className="divide-y divide-slate-100">
        {prazos.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="font-medium text-navy-900">
                {p.descricao}
                {p.tipo ? <span className="text-muted font-normal"> · {p.tipo}</span> : null}
              </p>
              <p className="text-xs text-muted">
                início {formatDate(p.dataInicial)} · calculado{" "}
                {formatDate(p.dataCalculadaAtual ?? p.dataInicial)}
                {p.dataEfetiva ? ` · efetivo ${formatDate(p.dataEfetiva)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {p.status !== "concluido" && <StatusBadge status={p.status} />}
              <PrazoStatusButton processoId={p.processoId} prazoId={p.id} status={p.status} />
            </div>
          </li>
        ))}
        {prazos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhum prazo associado.
          </li>
        )}
      </ul>
    </Card>
  );
}
