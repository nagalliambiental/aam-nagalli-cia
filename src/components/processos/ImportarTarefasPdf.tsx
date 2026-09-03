"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Modal, Select, Textarea } from "@/components/ui";
import { Upload } from "lucide-react";

type ItemTarefa = {
  texto: string;
  prazo: string | null;
  titulo: string;
  descricao: string;
  responsavelPessoaId: string;
};

function tituloDe(texto: string) {
  const line = texto.split("\n")[0].trim();
  return line.length > 70 ? line.slice(0, 70) + "…" : line;
}

export function ImportarTarefasPdf({
  processoId,
  responsaveis,
}: {
  processoId: number;
  responsaveis: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemTarefa[]>([]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/processos/${processoId}/tarefas/importar-pdf`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setItens((d.itens || []).map((it: { texto: string; prazo: string | null }) => ({
          texto: it.texto,
          prazo: it.prazo,
          titulo: tituloDe(it.texto),
          descricao: it.texto,
          responsavelPessoaId: responsaveis[0]?.id ? String(responsaveis[0].id) : "",
        })));
        setOpen(true);
      } else {
        setError(d.error ?? "Erro ao ler o documento.");
      }
    } catch {
      setError("Erro ao ler o documento.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function criarTarefas() {
    setSaving(true);
    setError(null);
    try {
      for (const it of itens) {
        const res = await fetch(`/api/processos/${processoId}/tarefas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: it.titulo,
            descricao: it.descricao,
            responsavelPessoaId: Number(it.responsavelPessoaId) || null,
            prazoData: it.prazo || null,
            visibilidade: "publico",
          }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Erro ao criar tarefa."); }
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar tarefas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <label className="flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
        <Upload className="h-4 w-4" /> {loading ? "Lendo..." : "Importar PDF"}
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={onFile} disabled={loading} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <Modal open={open} title="Tarefas identificadas no PDF" onClose={() => setOpen(false)}>
        <p className="mb-3 text-sm text-muted">Revise e ajuste cada tarefa antes de importar.</p>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {itens.map((it, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <Label htmlFor={`tt-${i}`}>Título</Label>
                <Input id={`tt-${i}`} value={it.titulo} onChange={(e) => setItens((arr) => arr.map((x, x2) => (x2 === i ? { ...x, titulo: e.target.value } : x)))} />
              </div>
              <div>
                <Label htmlFor={`ds-${i}`}>Descrição</Label>
                <Textarea id={`ds-${i}`} value={it.descricao} onChange={(e) => setItens((arr) => arr.map((x, x2) => (x2 === i ? { ...x, descricao: e.target.value } : x)))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`pz-${i}`}>Prazo</Label>
                  <Input id={`pz-${i}`} type="date" value={it.prazo ?? ""} onChange={(e) => setItens((arr) => arr.map((x, x2) => (x2 === i ? { ...x, prazo: e.target.value } : x)))} />
                </div>
                <div>
                  <Label htmlFor={`rp-${i}`}>Responsável pela Execução</Label>
                  <Select id={`rp-${i}`} value={it.responsavelPessoaId} onChange={(e) => setItens((arr) => arr.map((x, x2) => (x2 === i ? { ...x, responsavelPessoaId: e.target.value } : x)))}>
                    {responsaveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={criarTarefas} disabled={saving}>{saving ? "Importando..." : "Criar tarefas"}</Button>
        </div>
      </Modal>
    </>
  );
}
