"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select } from "@/components/ui";
import { Pencil, X } from "lucide-react";

export function EdicaoRapidaTarefa({
  tarefaId,
  responsavelPessoaId,
  prazoData,
  pessoas,
}: {
  tarefaId: number;
  responsavelPessoaId: number | null;
  prazoData: string | null;
  pessoas: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [responsavelId, setResponsavelId] = useState(String(responsavelPessoaId ?? ""));
  const [prazo, setPrazo] = useState(prazoData ?? "");
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setLoading(true);
    const res = await fetch(`/api/tarefas/${tarefaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responsavelPessoaId: responsavelId ? Number(responsavelId) : null,
        prazoData: prazo ? new Date(prazo) : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Edição rápida"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-600 ring-1 ring-slate-200 hover:bg-slate-100"
      >
        <Pencil className="h-3.5 w-3.5" /> Edição rápida
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <div>
            <Label htmlFor={`resp-${tarefaId}`}>Responsável</Label>
            <Select
              id={`resp-${tarefaId}`}
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="w-44 text-xs"
            >
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor={`prazo-${tarefaId}`}>Prazo</Label>
            <Input
              id={`prazo-${tarefaId}`}
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="w-36 text-xs"
            />
          </div>
          <Button type="button" onClick={salvar} disabled={loading} className="text-xs px-3 py-1.5">
            {loading ? "..." : "Salvar"}
          </Button>
          <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-700" title="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
