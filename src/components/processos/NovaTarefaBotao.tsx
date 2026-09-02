"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
      <Button variant="secondary" onClick={() => setOpen((o) => !o)}>
        <Plus className="h-4 w-4" /> {open ? "Cancelar" : "Nova tarefa"}
      </Button>
      {open && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <TarefaNovaForm pessoas={pessoas} processos={processos} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
