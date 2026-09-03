"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea, ConfirmPopup } from "@/components/ui";

export type EmpresaInput = {
  razaoSocial: string;
  nomeFantasia?: string;
  apelido?: string;
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
    apelido: (initial as Record<string, unknown>)?.apelido as string ?? "",
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
const [dup, setDup] = useState<{ message: string; existingId?: number } | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof EmpresaInput>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function buscarCNPJ() {
    const digits = (form.cnpj ?? "").replace(/\D/g, "");
    if (digits.length !== 14) {
      setCnpjError("CNPJ deve ter 14 dígitos.");
      return;
    }
    setCnpjLoading(true);
    setCnpjError(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? "CNPJ não encontrado.");
      }
      const data = await res.json() as {
        razao_social?: string;
        nome_fantasia?: string;
        ddd_telefone_1?: string;
        email?: string;
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        municipio?: string;
        uf?: string;
        cep?: string;
      };
      setForm((f) => ({
        ...f,
        razaoSocial: data.razao_social ?? f.razaoSocial,
        nomeFantasia: data.nome_fantasia ?? f.nomeFantasia,
        telefone: data.ddd_telefone_1 ?? f.telefone,
        email: data.email ?? f.email,
        endereco: [data.logradouro, data.numero, data.complemento, data.bairro].filter(Boolean).join(", ") || f.endereco,
        municipio: data.municipio ?? f.municipio,
        uf: data.uf ?? f.uf,
        cep: data.cep ? String(data.cep).replace(/\D/g, "") : f.cep,
      }));
    } catch (e) {
      setCnpjError(e instanceof Error ? e.message : "Erro ao buscar CNPJ.");
    } finally {
      setCnpjLoading(false);
    }
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
      setDup(res.status === 409 ? { message: data?.error ?? "Já existe um cadastro com este CNPJ.", existingId: data?.existingId } : null);
      setError(res.status === 409 ? null : (data?.error ?? "Erro ao salvar."));
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
          <Label htmlFor="apelido">Apelido</Label>
          <Input
            id="apelido"
            value={form.apelido}
            onChange={(e) => set("apelido", e.target.value)}
            placeholder="Ex.: Nagalli Matriz"
          />
        </div>
        <div>
          <Label htmlFor="cnpj">CNPJ</Label>
          <div className="flex gap-2">
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={(e) => set("cnpj", e.target.value)}
              placeholder="00.000.000/0000-00"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={buscarCNPJ} disabled={cnpjLoading}>
              {cnpjLoading ? "Buscando..." : "Buscar CNPJ"}
            </Button>
          </div>
          {cnpjError && <p className="mt-1 text-xs text-red-600">{cnpjError}</p>}
          <p className="mt-1 text-xs text-muted">Preenche razão social, nome fantasia, telefone, e-mail e endereço.</p>
        </div>
        <div>
          <Label htmlFor="inscricaoEstadual">Inscrição estadual</Label>
          <Input
            id="inscricaoEstadual"
            value={form.inscricaoEstadual}
            onChange={(e) => set("inscricaoEstadual", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            value={form.cep}
            onChange={(e) => set("cep", e.target.value)}
            placeholder="00000-000"
          />
        </div>
        <div className={`${grid} md:col-span-2`}>
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
        <div className={`${grid} md:col-span-2`}>
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

      <ConfirmPopup
        open={!!dup}
        title="Cadastro duplicado"
        message={dup?.message ?? ""}
        confirmText="Abrir existente"
        onCancel={() => setDup(null)}
        onConfirm={() => { if (dup?.existingId) { router.push(`/empresas/${dup.existingId}`); router.refresh(); } setDup(null); }}
      />
    </form>
  );
}
