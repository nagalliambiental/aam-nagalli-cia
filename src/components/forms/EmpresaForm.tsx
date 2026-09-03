"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea, ConfirmPopup } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";

type Contato = { nome: string; email: string; telefone: string; assunto: string };

export type EmpresaInput = {
  razaoSocial: string;
  nomeFantasia?: string;
  apelido?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  numeroEndereco?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
  contatos?: Contato[];
};

function mascaraCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += "." + d.slice(2, 5);
  if (d.length > 5) out += "." + d.slice(5, 8);
  if (d.length > 8) out += "/" + d.slice(8, 12);
  if (d.length > 12) out += "-" + d.slice(12, 14);
  return out;
}

function mascaraCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

const vazio: Contato = { nome: "", email: "", telefone: "", assunto: "" };

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
    apelido: initial?.apelido ?? "",
    cnpj: initial?.cnpj ?? "",
    inscricaoEstadual: initial?.inscricaoEstadual ?? "",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
    endereco: initial?.endereco ?? "",
    numeroEndereco: initial?.numeroEndereco ?? "",
    municipio: initial?.municipio ?? "",
    uf: initial?.uf ?? "",
    cep: initial?.cep ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [contatos, setContatos] = useState<Contato[]>(initial?.contatos?.length ? initial.contatos : [{ ...vazio }]);
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<{ message: string; existingId?: number } | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof EmpresaInput>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function buscarCNPJ(digitsArg?: string) {
    const digits = (digitsArg ?? form.cnpj ?? "").replace(/\D/g, "");
    if (digits.length !== 14) {
      setCnpjError("CNPJ deve ter 14 dígitos.");
      return;
    }
    setCnpjLoading(true);
    setCnpjError(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("CNPJ não encontrado.");
      const data = await res.json() as {
        razao_social?: string;
        nome_fantasia?: string;
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
        endereco: [data.logradouro, data.complemento, data.bairro].filter(Boolean).join(", ") ?? f.endereco,
        numeroEndereco: data.numero ?? f.numeroEndereco,
        municipio: data.municipio ?? f.municipio,
        uf: data.uf ?? f.uf,
        cep: data.cep ? mascaraCEP(String(data.cep)) : f.cep,
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
      body: JSON.stringify({
        ...form,
        contatos: contatos.filter((c) => c.nome || c.email || c.telefone || c.assunto),
      }),
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
  const setContato = (i: number, k: keyof Contato, v: string) =>
    setContatos((arr) => arr.map((c, x) => (x === i ? { ...c, [k]: v } : c)));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
        <div className="md:col-span-2">
          <Label htmlFor="apelido">Apelido</Label>
          <Input id="apelido" value={form.apelido} onChange={(e) => set("apelido", e.target.value)} placeholder="Ex.: Nagalli Matriz" />
        </div>

        <div>
          <Label htmlFor="razaoSocial" required>Razão Social</Label>
          <Input id="razaoSocial" value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
          <Input id="nomeFantasia" value={form.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} />
        </div>

        <div>
          <Label htmlFor="cnpj">CNPJ</Label>
          <div className="flex gap-2">
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={(e) => {
                const m = mascaraCNPJ(e.target.value);
                set("cnpj", m);
                if (m.replace(/\D/g, "").length === 14) buscarCNPJ(m);
              }}
              placeholder="00.000.000/0000-00"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={() => buscarCNPJ()} disabled={cnpjLoading}>
              {cnpjLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          {cnpjError && <p className="mt-1 text-xs text-red-600">{cnpjError}</p>}
          <p className="mt-1 text-xs text-muted">Preenche razão social, nome fantasia e endereço.</p>
        </div>
        <div>
          <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
          <Input id="inscricaoEstadual" value={form.inscricaoEstadual} onChange={(e) => set("inscricaoEstadual", e.target.value)} />
        </div>

        <div>
          <Label htmlFor="cep">CEP</Label>
          <Input id="cep" value={form.cep} onChange={(e) => set("cep", mascaraCEP(e.target.value))} placeholder="00000-000" />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <div className="flex gap-2">
            <Input id="endereco" value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Logradouro, complemento, bairro" className="flex-1" />
            <Input id="numeroEndereco" value={form.numeroEndereco} onChange={(e) => set("numeroEndereco", e.target.value)} placeholder="Nº" className="w-28" />
          </div>
        </div>

        <div>
          <Label htmlFor="municipio">Município</Label>
          <Input id="municipio" value={form.municipio} onChange={(e) => set("municipio", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} maxLength={2} />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
        </div>
      </div>

      {/* Contatos */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">Contatos</h3>
          <Button type="button" variant="secondary" onClick={() => setContatos((arr) => [...arr, { ...vazio }])} className="px-3 py-1.5 text-xs">
            <Plus className="h-4 w-4" /> Adicionar contato
          </Button>
        </div>
        <div className="space-y-3">
          {contatos.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
              <div>
                <Label htmlFor={`cnome-${i}`}>Pessoa</Label>
                <Input id={`cnome-${i}`} value={c.nome} onChange={(e) => setContato(i, "nome", e.target.value)} placeholder="Nome" />
              </div>
              <div>
                <Label htmlFor={`cemail-${i}`}>E-mail</Label>
                <Input id={`cemail-${i}`} type="email" value={c.email} onChange={(e) => setContato(i, "email", e.target.value)} />
              </div>
              <div>
                <Label htmlFor={`ctel-${i}`}>Telefone</Label>
                <Input id={`ctel-${i}`} value={c.telefone} onChange={(e) => setContato(i, "telefone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor={`cass-${i}`}>Assunto</Label>
                <Input id={`cass-${i}`} value={c.assunto} onChange={(e) => setContato(i, "assunto", e.target.value)} placeholder="Ex.: Representante" />
              </div>
              <div className="flex justify-end sm:col-span-4">
                <button type="button" onClick={() => setContatos((arr) => arr.filter((_, x) => x !== i))} disabled={contatos.length === 1} className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-40" title="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : empresaId ? "Salvar alterações" : "Criar cliente"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
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
