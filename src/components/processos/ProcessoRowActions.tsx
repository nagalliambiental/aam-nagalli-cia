"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/processos/StatusBadge";
import { formatDate } from "@/lib/format";
import { Trash2 } from "lucide-react";

export function ProcessoRowActions({ processo }: { processo: { id: number; numero: string; nup: string | null; orgao: { sigla: string }; tipoProcesso: { nome: string }; empreendimento: { id: number; nome: string } | null; dataAbertura: Date; status: string; _count: { eventos: number; prazos: number; tarefas: number } } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
            #{processo.numero} <span className="text-muted font-normal">· {processo.orgao.sigla}</span>
            {processo.nup ? <span className="ml-2 text-xs font-normal text-navy-600">NUP {processo.nup}</span> : null}
          </p>
          <p className="truncate text-sm text-muted">
            {processo.tipoProcesso.nome}
          </p>
          {processo.empreendimento ? (
            <p className="truncate text-xs">
              <span className="text-muted">Empreendimento:</span>{" "}
              <span className="font-medium text-navy-700">{processo.empreendimento.nome}</span>
            </p>
          ) : (
            <p className="text-xs text-muted">Empreendimento: — sem vínculo —</p>
          )}
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <div className="text-right text-sm text-muted">
            <p>aberto em {formatDate(processo.dataAbertura)}</p>
            <p>{processo._count.eventos} eventos · {processo._count.prazos} prazos · {processo._count.tarefas} tarefas</p>
          </div>
          <StatusBadge status={processo.status} />
        </div>
      </Link>
      <button onClick={handleDelete} disabled={loading} title="Excluir" className="ml-3 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
