"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/processos/StatusBadge";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { statusAmbiental } from "@/lib/status";
import { Trash2 } from "lucide-react";

export function ProcessoRowActions({ processo, podeExcluir = false, temNovaMovimentacao = false }: { processo: { id: number; numero: string; apelido: string | null; nup: string | null; orgao: { sigla: string }; natureza: string; fase: string | null; modalidade: string | null; numeroLicenca: string | null; empreendimento: { id: number; nome: string; apelido?: string | null } | null; dataAbertura: Date; status: string; validade: Date | null; dataLimiteRenovacao: Date | null; dataProtocolo: Date | null; _count: { eventos: number; prazos: number; tarefas: number } }; podeExcluir?: boolean; temNovaMovimentacao?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const status = processo.natureza === "ambiental"
    ? statusAmbiental(processo.validade, processo.status, processo.dataLimiteRenovacao, processo.dataProtocolo)
    : processo.status;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Excluir processo #${processo.numero}?`)) return;
    setLoading(true);
    const res = await fetch(`/api/processos/${processo.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else { alert("Erro ao excluir"); setLoading(false); }
  }

  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
      <Link href={`/processos/${processo.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-navy-900">
            {processo.numero}
            <span className="font-normal text-navy-700">
              {" · "}
              {processo.empreendimento
                ? processo.empreendimento.apelido || processo.empreendimento.nome
                : <span className="text-muted">sem empreendimento</span>}
            </span>
            {processo.natureza === "ambiental" && processo.numeroLicenca ? (
              <span className="text-muted font-normal"> · {processo.numeroLicenca}</span>
            ) : null}
          </p>
          <p className="truncate text-sm text-muted">
            {processo.modalidade ? `Fase: ${processo.modalidade}` : (processo.fase ? `Fase: ${processo.fase}` : "—")}
          </p>
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <div className="text-right text-sm text-muted">
            <p>aberto em {formatDate(processo.dataAbertura)}</p>
            <p>{processo._count.eventos} eventos · {processo._count.prazos} prazos · {processo._count.tarefas} tarefas</p>
          </div>
          <StatusBadge status={status} />
          {temNovaMovimentacao && <Badge tone="blue">nova movimentação SEI</Badge>}
        </div>
      </Link>
      {podeExcluir && (
        <button onClick={handleDelete} disabled={loading} title="Excluir" className="ml-3 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
