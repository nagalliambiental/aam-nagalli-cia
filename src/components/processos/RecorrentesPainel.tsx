"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Badge, EmptyState } from "@/components/ui";
import { RefreshCw, Pause, Play, Trash2, Pencil } from "lucide-react";
import { formatDate } from "@/lib/format";

export type RegraRecorrenteDTO = {
  id: number;
  titulo: string;
  intervaloDias: number;
  ativo: boolean;
  prioridade: string;
  fimRecorrencia: string | null;
  responsavelNome: string;
  vinculo: string | null;
  proximaPrevista: string | null;
  ocorrencia: { id: number; status: string; prazoData: string | null; dataConclusao: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: "Não Iniciado",
  em_andamento: "Em Andamento",
  para_revisao: "Para Revisão",
  concluida: "Concluída",
};

export function RecorrentesPainel({
  regras,
  podeEditar,
  podeExcluir,
}: {
  regras: RegraRecorrenteDTO[];
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<number | null>(null);
  const [intervalo, setIntervalo] = useState("30");
  const [fim, setFim] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarAtivo(regra: RegraRecorrenteDTO) {
    const res = await fetch(`/api/tarefas/recorrentes/${regra.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !regra.ativo }),
    });
    if (res.ok) router.refresh();
  }

  function abrirEdicao(regra: RegraRecorrenteDTO) {
    setEditando(regra.id);
    setIntervalo(String(regra.intervaloDias));
    setFim(regra.fimRecorrencia ?? "");
    setErro(null);
  }

  async function salvar(regraId: number) {
    const n = Number(intervalo);
    if (!Number.isFinite(n) || n < 1 || n > 3650) {
      setErro("Intervalo deve ser de 1 a 3650 dias.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const res = await fetch(`/api/tarefas/recorrentes/${regraId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervaloDias: Math.floor(n), fimRecorrencia: fim || null }),
    });
    setSalvando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d.error ?? "Erro ao salvar regra.");
      return;
    }
    setEditando(null);
    router.refresh();
  }

  async function excluir(regra: RegraRecorrenteDTO) {
    if (!confirm(`Excluir a regra de recorrência "${regra.titulo}"?\n\nAs tarefas já criadas serão mantidas.`)) return;
    const res = await fetch(`/api/tarefas/recorrentes/${regra.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  if (regras.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa recorrente"
        description='Marque "Tarefa recorrente" ao criar uma tarefa para repeti-la automaticamente a cada N dias.'
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {regras.map((r) => {
        const ocorrenciaAberta = r.ocorrencia && r.ocorrencia.status !== "concluida";
        return (
          <li key={r.id} className="px-5 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <RefreshCw className={`h-3.5 w-3.5 ${r.ativo ? "text-navy-500" : "text-slate-400"}`} />
                  <p className="font-medium text-navy-900">{r.titulo}</p>
                  <Badge tone={r.ativo ? "blue" : "gray"}>{r.ativo ? "Ativa" : "Pausada"}</Badge>
                  {!ocorrenciaAberta && r.ativo && <Badge tone="amber">Aguardando conclusão</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  A cada {r.intervaloDias} dias · Responsável: {r.responsavelNome}
                  {r.vinculo ? ` · ${r.vinculo}` : ""}
                  {r.fimRecorrencia ? ` · termina em ${formatDate(new Date(r.fimRecorrencia))}` : ""}
                </p>
                <p className="mt-1 text-xs text-navy-700">
                  {r.ocorrencia ? (
                    <>
                      Ocorrência atual:{" "}
                      <Link href={`/tarefas/${r.ocorrencia.id}`} className="font-medium underline-offset-2 hover:underline">
                        {STATUS_LABEL[r.ocorrencia.status] ?? r.ocorrencia.status}
                      </Link>
                      {r.ocorrencia.prazoData ? ` · prazo ${formatDate(new Date(r.ocorrencia.prazoData))}` : ""}
                    </>
                  ) : (
                    "Nenhuma ocorrência aberta"
                  )}
                  {r.ativo && r.proximaPrevista ? ` · próxima prevista ${formatDate(new Date(r.proximaPrevista))}` : ""}
                </p>

                {editando === r.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <label className="block text-xs font-medium text-muted" htmlFor={`intervalo-${r.id}`}>
                        Repetir a cada (dias)
                      </label>
                      <input
                        id={`intervalo-${r.id}`}
                        type="number"
                        min={1}
                        max={3650}
                        value={intervalo}
                        onChange={(e) => setIntervalo(e.target.value)}
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted" htmlFor={`fim-${r.id}`}>
                        Terminar em (opcional)
                      </label>
                      <Input id={`fim-${r.id}`} type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
                    </div>
                    <Button onClick={() => salvar(r.id)} disabled={salvando} className="px-3 py-1.5">
                      {salvando ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditando(null)} className="px-3 py-1.5">
                      Cancelar
                    </Button>
                    {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {podeEditar && (
                  <>
                    <button
                      type="button"
                      onClick={() => (editando === r.id ? setEditando(null) : abrirEdicao(r))}
                      title="Editar regra"
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarAtivo(r)}
                      title={r.ativo ? "Pausar regra" : "Reativar regra"}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy-700"
                    >
                      {r.ativo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  </>
                )}
                {podeExcluir && (
                  <button
                    type="button"
                    onClick={() => excluir(r)}
                    title="Excluir regra"
                    className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
