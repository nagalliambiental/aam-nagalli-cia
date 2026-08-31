"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function PessoaForm({
  initial,
  pessoaId,
}: {
  initial?: {
    nome?: string;
    documento?: string;
    tipoPessoa?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cep?: string;
    observacoes?: string;
  };
  pessoaId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    documento: initial?.documento ?? "",
    tipoPessoa: initial?.tipoPessoa ?? "fisica",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
    endereco: initial?.endereco ?? "",
    cep: initial?.cep ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(
      pessoaId ? `/api/pessoas/${pessoaId}` : "/api/pessoas",
      {
        method: pessoaId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/pessoas/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
        <div className="md:col-span-2">
          <Label htmlFor="nome" required>Nome</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="tipoPessoa">Tipo</Label>
          <Select
            id="tipoPessoa"
            value={form.tipoPessoa}
            onChange={(e) => setForm((f) => ({ ...f, tipoPessoa: e.target.value }))}
          >
            <option value="fisica">Pessoa física</option>
            <option value="juridica">Pessoa jurídica</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="documento">CPF/CNPJ</Label>
          <Input
            id="documento"
            value={form.documento}
            onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={form.telefone}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            value={form.endereco}
            onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            value={form.cep}
            onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
          />
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
          {loading ? "Salvando..." : pessoaId ? "Salvar alterações" : "Criar pessoa"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
