"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Undo2 } from "lucide-react";

export function ImportarTarefas() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [lastImportId, setLastImportId] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMsg(null);
    setOk(false);
    setLastImportId(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/tarefas/importar", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        const err = d.erros?.length ? ` | ${d.erros.length} erro(s): ${d.erros.slice(0, 3).join("; ")}` : "";
        setMsg(`${d.criadas} tarefa(s) criada(s).${err}`);
        setOk(true);
        setLastImportId(d.importId ?? null);
        router.refresh();
      } else {
        setMsg(d.error ?? "Erro ao importar.");
      }
    } catch {
      setMsg("Erro ao importar.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function desfazer() {
    if (!lastImportId) return;
    if (!confirm("Desfazer esta importação? As tarefas criadas(e exigências vinculadas) serão removidas.")) return;
    setUndoing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tarefas/desfazer-importacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: lastImportId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`Importação desfeita (${d.removidas} tarefa(s) removida(s)).`);
        setOk(false);
        setLastImportId(null);
        router.refresh();
      } else {
        setMsg(d.error ?? "Erro ao desfazer.");
      }
    } catch {
      setMsg("Erro ao desfazer.");
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
        <Upload className="h-4 w-4" /> {loading ? "Importando..." : "Importar"}
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} disabled={loading} />
      </label>
      <a href="/api/tarefas/modelo" className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
        <Download className="h-4 w-4" /> Modelo
      </a>
      {ok && lastImportId && (
        <button
          type="button"
          onClick={desfazer}
          disabled={undoing}
          className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          <Undo2 className="h-4 w-4" /> {undoing ? "Desfazendo..." : "Desfazer"}
        </button>
      )}
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
