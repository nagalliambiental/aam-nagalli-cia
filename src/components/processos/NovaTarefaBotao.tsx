"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui";
import { TarefaNovaForm } from "@/components/processos/TarefaNovaForm";

export function NovaTarefaBotao({
  pessoas,
  processos,
}: {
  pessoas: { id: number; nome: string }[];
  processos: { id: number; numero: string; nup: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
      )}
      {open && (
        <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h3 className="text-sm font-semibold text-navy-900">Nova tarefa</h3>
            <button
              onClick={() => setOpen(false)}
              title="Fechar"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <TarefaNovaForm pessoas={pessoas} processos={processos} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
