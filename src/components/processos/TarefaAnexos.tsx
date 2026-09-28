"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Paperclip, Trash2, Upload } from "lucide-react";
import { formatBytes, formatDateTime } from "@/lib/format";

type Anexo = { id: number; nome: string; mime: string; tamanho: number; criadoEm: string };

export function TarefaAnexos({ tarefaId, podeEditar = true }: { tarefaId: number; podeEditar?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/tarefas/${tarefaId}/anexos`);
      const d = await res.json().catch(() => ({}));
      if (res.ok) setAnexos(d.anexos ?? []);
    } catch {
      // mantém a lista atual
    } finally {
      setCarregando(false);
    }
  }, [tarefaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setMsg("Arquivo acima do limite de 4 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setEnviando(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const res = await fetch(`/api/tarefas/${tarefaId}/anexos`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`"${d.anexo?.nome ?? file.name}" anexado.`);
        await carregar();
        router.refresh();
      } else {
        setMsg(d.error ?? "Erro ao anexar o arquivo.");
      }
    } catch {
      setMsg("Erro ao anexar o arquivo.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function excluir(anexo: Anexo) {
    if (!confirm(`Excluir o anexo "${anexo.nome}"?`)) return;
    setExcluindo(anexo.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/tarefas/anexos/${anexo.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("Anexo excluído.");
        await carregar();
        router.refresh();
      } else {
        setMsg(d.error ?? "Erro ao excluir o anexo.");
      }
    } catch {
      setMsg("Erro ao excluir o anexo.");
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {podeEditar && (
          <label className="flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> {enviando ? "Enviando..." : "Anexar arquivo"}
            <input ref={inputRef} type="file" className="hidden" onChange={enviar} disabled={enviando} />
          </label>
        )}
        <span className="text-xs text-muted">Formatos livres · até 4 MB por arquivo</span>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>

      {carregando ? (
        <p className="text-sm text-muted">Carregando anexos...</p>
      ) : anexos.length === 0 ? (
        <p className="text-sm text-muted">Nenhum arquivo anexado a esta tarefa.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {anexos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-4 w-4 shrink-0 text-navy-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900">{a.nome}</p>
                  <p className="text-xs text-muted">{formatBytes(a.tamanho)} · {formatDateTime(a.criadoEm)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`/api/tarefas/anexos/${a.id}?disposicao=inline`}
                  target="_blank"
                  rel="noreferrer"
                  title="Visualizar"
                  className="rounded-md p-1.5 text-navy-600 hover:bg-slate-100"
                >
                  <Eye className="h-4 w-4" />
                </a>
                <a
                  href={`/api/tarefas/anexos/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Baixar"
                  className="rounded-md p-1.5 text-navy-600 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                </a>
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => excluir(a)}
                    disabled={excluindo === a.id}
                    title="Excluir anexo"
                    className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
