"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

export function ImportarProcessos() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/processos/importar", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        const err = d.erros?.length ? ` | ${d.erros.length} aviso(s): ${d.erros.slice(0, 3).join("; ")}` : "";
        const tok = d.comToken ? ` (${d.comToken} com URL SEI — movimentações verificadas no 1º uso)` : "";
        setMsg(`${d.criados} processo(s) importado(s).${tok}${err}`);
      } else {
        setMsg(d.error ?? "Erro ao importar.");
      }
    } catch {
      setMsg("Erro ao importar.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
        <Upload className="h-4 w-4" /> {loading ? "Importando..." : "Importar"}
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} disabled={loading} />
      </label>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
