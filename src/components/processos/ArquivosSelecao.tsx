"use client";

import { useRef } from "react";
import { Label } from "@/components/ui";
import { FileText, Paperclip, X } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { TAMANHO_MAXIMO_ANEXO } from "@/lib/anexos-cliente";

/**
 * Seletor de arquivos para os formulários de criação de tarefa.
 * Mostra os escolhidos em "chips" que podem ser removidos antes de enviar.
 */
export function ArquivosSelecao({
  arquivos,
  onChange,
  id = "arquivos-tarefa",
  rotulo = "Arquivos",
  disabled = false,
}: {
  arquivos: File[];
  onChange: (arquivos: File[]) => void;
  id?: string;
  rotulo?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function adicionar(e: React.ChangeEvent<HTMLInputElement>) {
    const novos = Array.from(e.target.files ?? []);
    const jaTem = new Set(arquivos.map((a) => `${a.name}#${a.size}`));
    const lista = [...arquivos];
    for (const arquivo of novos) {
      const chave = `${arquivo.name}#${arquivo.size}`;
      if (jaTem.has(chave)) continue;
      jaTem.add(chave);
      lista.push(arquivo);
    }
    onChange(lista);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <label className={`flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
          <Paperclip className="h-4 w-4" /> Selecionar arquivos
          <input ref={inputRef} id={id} type="file" multiple className="hidden" onChange={adicionar} disabled={disabled} />
        </label>
        <span className="text-xs text-muted">até 4 MB cada</span>
      </div>

      {arquivos.length > 0 && (
        <ul className="space-y-1">
          {arquivos.map((a, i) => (
            <li key={`${a.name}#${a.size}#${i}`} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-navy-800">
                <FileText className="h-3.5 w-3.5 shrink-0 text-navy-500" />
                <span className="truncate">{a.name}</span>
                <span className="shrink-0 text-muted">({formatBytes(a.size)})</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(arquivos.filter((_, index) => index !== i))}
                title="Remover"
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Formatos livres · limite de {formatBytes(TAMANHO_MAXIMO_ANEXO)} por arquivo.</p>
    </div>
  );
}
