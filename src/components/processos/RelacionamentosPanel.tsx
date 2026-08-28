import { Card, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui";

type RelacionamentoItem = {
  id: number;
  tipoRelacao: { nome: string };
  processoRelacionado: {
    id: number;
    numero: string;
    tipoProcesso: { nome: string };
    orgao: { sigla: string };
  };
  observacao: string | null;
};

export function RelacionamentosPanel({
  relacionamentos,
}: {
  processoId: number;
  relacionamentos: RelacionamentoItem[];
}) {
  return (
    <Card>
      <CardHeader title="Processos relacionados" />
      <ul className="divide-y divide-slate-100">
        {relacionamentos.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="font-medium text-navy-900">
                #{r.processoRelacionado.numero}{" "}
                <span className="text-muted font-normal">
                  · {r.processoRelacionado.orgao.sigla}
                </span>
              </p>
              <p className="text-xs text-muted">{r.processoRelacionado.tipoProcesso.nome}</p>
              {r.observacao && (
                <p className="text-xs text-muted mt-0.5">{r.observacao}</p>
              )}
            </div>
            <Badge tone="blue">{r.tipoRelacao.nome}</Badge>
          </li>
        ))}
        {relacionamentos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhum relacionamento.
          </li>
        )}
      </ul>
    </Card>
  );
}
