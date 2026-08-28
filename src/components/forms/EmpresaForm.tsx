"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";

export type EmpresaInput = {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
};

export function EmpresaForm({
  initial,
  empresaId,
}: {
  initial?: Partial<EmpresaInput>;
  empresaId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<EmpresaInput>({
    razaoSocial: initial?.razaoSocial ?? "",
    nomeFantasia: initial?.nomeFantasia ?? "",
    cnpj: initial?.cnpj ?? "",
    inscricaoEstadual: initial?.inscricaoEstadual ?? "",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
    endereco: initial?.endereco ?? "",
    municipio: initial?.municipio ?? "",
    uf: initial?.uf ?? "",
    cep: initial?.cep ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof EmpresaInput>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(empresaId ? `/api/empresas/${empresaId}` : "/api/empresas", {
      method: empresaId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/empresas/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
        <div className="md:col-span-2">
          <Label htmlFor="razaoSocial" required>
            Razão social
          </Label>
          <Input
            id="razaoSocial"
            value={form.razaoSocial}
            onChange={(e) => set("razaoSocial", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="nomeFantasia">Nome fantasia</Label>
          <Input
            id="nomeFantasia"
            value={form.nomeFantasia}
            onChange={(e) => set("nomeFantasia", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={form.cnpj}
            onChange={(e) => set("cnpj", e.target.value)}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div>
          <Label htmlFor="inscricaoEstadual">Inscrição estadual</Label>
          <Input
            id="inscricaoEstadual"
            value={form.inscricaoEstadual}
            onChange={(e) => set("inscricaoEstadual", e.target.value)}
          />
        </div>
        <div className={grid}>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={form.telefone}
              onChange={(e) => set("telefone", e.target.value)}
            />
          </div>
        </div>
        <div className={grid}>
          <div>
            <Label htmlFor="municipio">Município</Label>
            <Input
              id="municipio"
              value={form.municipio}
              onChange={(e) => set("municipio", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input
              id="uf"
              value={form.uf}
              onChange={(e) => set("uf", e.target.value)}
              maxLength={2}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            value={form.endereco}
            onChange={(e) => set("endereco", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={form.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : empresaId ? "Salvar alterações" : "Criar empresa"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
