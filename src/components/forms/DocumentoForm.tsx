"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function DocumentoForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    tipo: "outro",
    categoria: "documento",
    observacoes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    setLoading(true);

    const body = new FormData();
    body.append("file", file);
    body.append("tipo", form.tipo);
    body.append("categoria", form.categoria);
    body.append("observacoes", form.observacoes);

    const res = await fetch("/api/documentos", {
      method: "POST",
      body,
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao enviar documento.");
      return;
    }
    router.push(`/documentos/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="file" required>Arquivo</Label>
          <input
            id="file"
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800"
          />
        </div>
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            id="tipo"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
          >
            <option value="outro">Outro</option>
            <option value="relatorio">Relatório</option>
            <option value="laudo">Laudo</option>
            <option value="estudo">Estudo</option>
            <option value="comprovante">Comprovante</option>
            <option value="oficio">Ofício</option>
            <option value="contrato">Contrato</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="categoria">Categoria</Label>
          <Select
            id="categoria"
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
          >
            <option value="documento">Documento</option>
            <option value="minerario">Minerário</option>
            <option value="ambiental">Ambiental</option>
            <option value="financeiro">Financeiro</option>
            <option value="juridico">Jurídico</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            rows={3}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar documento"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
