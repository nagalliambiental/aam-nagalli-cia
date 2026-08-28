"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

export function OrgaoForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    sigla: "",
    nivel: "estadual",
    ambito: "ambiental",
    site: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/orgaos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push("/orgaos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nome" required>Nome do órgão</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="sigla" required>Sigla</Label>
          <Input
            id="sigla"
            value={form.sigla}
            onChange={(e) => setForm((f) => ({ ...f, sigla: e.target.value.toUpperCase() }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="nivel">Nível</Label>
          <select
            id="nivel"
            value={form.nivel}
            onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="federal">Federal</option>
            <option value="estadual">Estadual</option>
            <option value="municipal">Municipal</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ambito">Âmbito</Label>
          <select
            id="ambito"
            value={form.ambito}
            onChange={(e) => setForm((f) => ({ ...f, ambito: e.target.value }))}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="mineral">Mineral</option>
            <option value="ambiental">Ambiental</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="site">Site (opcional)</Label>
        <Input
          id="site"
          value={form.site}
          onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Criar órgão"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
