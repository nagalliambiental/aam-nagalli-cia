"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";

type Perm = { id: number; chave: string; modulo: string; acao: string };

export function PerfilForm({
  permissoes,
  initial,
  perfilId,
}: {
  permissoes: Perm[];
  initial?: {
    nome?: string;
    descricao?: string;
    sistema?: boolean;
    selecionadas?: Set<number>;
  };
  perfilId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    descricao: initial?.descricao ?? "",
  });
  const [selected, setSelected] = useState<Set<number>>(initial?.selecionadas ?? new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const porModulo = permissoes.reduce<Record<string, Perm[]>>((acc, p) => {
    (acc[p.modulo] ??= []).push(p);
    return acc;
  }, {});

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModulo(modulo: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      for (const p of porModulo[modulo] ?? []) {
        if (on) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(perfilId ? `/api/perfis/${perfilId}` : "/api/perfis", {
      method: perfilId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        permissaoIds: [...selected],
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/perfis/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="nome" required>Nome</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="descricao">Descrição</Label>
          <Input
            id="descricao"
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-navy-900">Permissões</p>
          <p className="text-xs text-muted">{selected.size} selecionadas</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(porModulo).map(([modulo, perms]) => {
            const todas = perms.every((p) => selected.has(p.id));
            return (
              <div key={modulo} className="rounded-lg border border-slate-200 p-3">
                <label className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todas}
                    onChange={(e) => toggleModulo(modulo, e.target.checked)}
                    className="h-4 w-4 accent-navy-700"
                  />
                  <span className="text-sm font-semibold capitalize text-navy-900">{modulo}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs transition hover:border-navy-400"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="h-3.5 w-3.5 accent-navy-700"
                      />
                      {p.acao}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : perfilId ? "Salvar alterações" : "Criar perfil"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
