"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

export function UsuarioForm({
  perfis,
  pessoas,
  initial,
  usuarioId,
}: {
  perfis: { id: number; nome: string }[];
  pessoas: { id: number; nome: string }[];
  initial?: {
    email?: string;
    perfilId?: number;
    pessoaId?: number | null;
    ativo?: boolean;
  };
  usuarioId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: initial?.email ?? "",
    senha: "",
    perfilId: String(initial?.perfilId ?? perfis[0]?.id ?? ""),
    pessoaId: String(initial?.pessoaId ?? ""),
    ativo: initial?.ativo ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!form.email.trim()) {
      setError("E-mail é obrigatório.");
      setLoading(false);
      return;
    }
    if (!usuarioId && !form.senha) {
      setError("Defina uma senha inicial.");
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      email: form.email.trim(),
      perfilId: Number(form.perfilId),
      pessoaId: form.pessoaId ? Number(form.pessoaId) : null,
      ativo: form.ativo,
    };
    if (form.senha) payload.senha = form.senha;

    const res = await fetch(usuarioId ? `/api/usuarios/${usuarioId}` : "/api/usuarios", {
      method: usuarioId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(usuarioId ? `/usuarios` : `/usuarios/${data.id}`);
    router.refresh();
  }

  const selectCls =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email" required>E-mail (login)</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="nome@empresa.com.br"
            required
          />
        </div>
        <div>
          <Label htmlFor="senha" required={!usuarioId}>
            {usuarioId ? "Nova senha (opcional)" : "Senha inicial"}
          </Label>
          <Input
            id="senha"
            type="password"
            value={form.senha}
            onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
            placeholder={usuarioId ? "Deixe em branco para manter" : "••••••••"}
          />
        </div>
        <div>
          <Label htmlFor="perfilId" required>Perfil de acesso</Label>
          <select
            id="perfilId"
            value={form.perfilId}
            onChange={(e) => setForm((f) => ({ ...f, perfilId: e.target.value }))}
            className={selectCls}
            required
          >
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pessoaId">Vincular a pessoa</Label>
          <select
            id="pessoaId"
            value={form.pessoaId}
            onChange={(e) => setForm((f) => ({ ...f, pessoaId: e.target.value }))}
            className={selectCls}
          >
            <option value="">(nenhuma)</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
              className="h-4 w-4 accent-navy-700"
            />
            Usuário ativo (pode acessar o sistema)
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : usuarioId ? "Salvar alterações" : "Criar usuário"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
