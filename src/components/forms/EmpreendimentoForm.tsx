"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea, ConfirmPopup } from "@/components/ui";
import { Selecionar } from "@/components/ui/Selecionar";
import { TIPOS_EMPREENDIMENTO } from "@/lib/empreendimentos";

export function EmpreendimentoForm({
  empresas,
  initial,
  empreendimentoId,
}: {
  empresas: { id: number; razaoSocial: string; cnpj?: string | null }[];
  initial?: {
    nome?: string;
    apelido?: string;
    tipo?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
    endereco?: string;
    status?: string;
    descricao?: string;
    observacoes?: string;
    empresaPrincipalId?: number;
    filial?: boolean;
    cnpj?: string;
  };
  empreendimentoId?: number;
}) {
  const router = useRouter();
  const ehTipoCustom = !!initial?.tipo && !TIPOS_EMPREENDIMENTO.some((t) => t.value === initial.tipo);
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    apelido: initial?.apelido ?? "",
    tipo: ehTipoCustom ? "outro" : (initial?.tipo ?? "pedreira"),
    tipoOutro: ehTipoCustom ? (initial?.tipo ?? "") : "",
    municipio: initial?.municipio ?? "",
    uf: initial?.uf ?? "",
    cep: initial?.cep ?? "",
    endereco: initial?.endereco ?? "",
    status: initial?.status ?? "ativo",
    descricao: initial?.descricao ?? "",
    observacoes: initial?.observacoes ?? "",
    empresaPrincipalId: String(initial?.empresaPrincipalId ?? empresas[0]?.id ?? ""),
    filial: initial?.filial ?? false,
    cnpj: initial?.cnpj ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<{ message: string; existingId?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Busca automática de endereço pelo CEP (ViaCEP)
  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (d && !d.erro) {
        setForm((f) => ({
          ...f,
          endereco: d.logradouro || f.endereco,
          municipio: d.localidade || f.municipio,
          uf: d.uf || f.uf,
          cep: d.cep || f.cep,
        }));
      } else {
        setError("CEP não encontrado.");
      }
    } catch {
      setError("Falha ao buscar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.filial) {
      const cnpjDigits = (form.cnpj ?? "").replace(/\D/g, "");
      if (cnpjDigits.length !== 14) {
        setError("CNPJ é obrigatório para empreendimento filial (14 dígitos).");
        return;
      }
    }
    setLoading(true);

    const payload = {
      ...form,
      tipo: form.tipo === "outro" ? (form.tipoOutro.trim() || "outro") : form.tipo,
      empresaPrincipalId: form.empresaPrincipalId ? Number(form.empresaPrincipalId) : null,
      filial: form.filial,
      cnpj: form.filial ? (form.cnpj ?? "").replace(/\D/g, "") : null,
    };

    const res = await fetch(
      empreendimentoId ? `/api/empreendimentos/${empreendimentoId}` : "/api/empreendimentos",
      {
        method: empreendimentoId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setDup(res.status === 409 ? { message: data?.error ?? "Empreendimento já cadastrado.", existingId: data?.existingId } : null);
      setError(res.status === 409 ? null : (data?.error ?? "Erro ao salvar."));
      return;
    }
    router.push(`/empreendimentos/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
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
          <Label htmlFor="apelido">Apelido</Label>
          <Input
            id="apelido"
            value={form.apelido}
            onChange={(e) => setForm((f) => ({ ...f, apelido: e.target.value }))}
            placeholder="Ex.: Pedreira Norte"
          />
        </div>
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            id="tipo"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
          >
            {TIPOS_EMPREENDIMENTO.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>
        {form.tipo === "outro" && (
          <div>
            <Label htmlFor="tipoOutro">Tipo (outro)</Label>
            <Input
              id="tipoOutro"
              value={form.tipoOutro}
              onChange={(e) => setForm((f) => ({ ...f, tipoOutro: e.target.value }))}
              placeholder="Digite o tipo do empreendimento"
            />
          </div>
        )}
        <div>
          <Label htmlFor="empresaPrincipalId" required>Cliente principal</Label>
          <Selecionar
            id="empresaPrincipalId"
            value={form.empresaPrincipalId}
            onChange={(v) => setForm((f) => ({ ...f, empresaPrincipalId: v }))}
            opcoes={empresas.map((x) => ({ value: String(x.id), label: x.razaoSocial }))}
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ativo">Ativo</option>
            <option value="paralisado">Paralisado</option>
            <option value="encerrado">Encerrado</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-900">
            <input
              type="checkbox"
              checked={form.filial}
              onChange={(e) => setForm((f) => ({ ...f, filial: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500"
            />
            É filial?
          </label>
          <p className="mt-1 text-xs text-muted">
            {form.filial
              ? "Informe o CNPJ próprio desta filial."
              : `Sem marcação, o empreendimento usa o CNPJ da matriz (cliente).${empresas.find((x) => String(x.id) === form.empresaPrincipalId && x.cnpj ? ` CNPJ: ${(x.cnpj as string).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}` : "")}`}
          </p>
          {form.filial && (
            <div className="mt-2 max-w-xs">
              <Label htmlFor="cnpjFilial" required>CNPJ da filial</Label>
              <Input
                id="cnpjFilial"
                value={form.cnpj}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 14);
                  let out = d.slice(0, 2);
                  if (d.length > 2) out += "." + d.slice(2, 5);
                  if (d.length > 5) out += "." + d.slice(5, 8);
                  if (d.length > 8) out += "/" + d.slice(8, 12);
                  if (d.length > 12) out += "-" + d.slice(12, 14);
                  setForm((f) => ({ ...f, cnpj: out }));
                }}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="cep">CEP</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              value={form.cep}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                setForm((f) => ({ ...f, cep: d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d }));
              }}
              placeholder="00000-000"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={buscarCep} disabled={cepLoading} className="shrink-0">
              {cepLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>
        <div>
            <Label htmlFor="municipio">Município</Label>
            <Input
              id="municipio"
              value={form.municipio}
              onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
              disabled={cepLoading}
            />
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input
              id="uf"
              value={form.uf}
              onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
              maxLength={2}
              disabled={cepLoading}
            />
          </div>

        <div className="md:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            value={form.endereco}
            onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
            disabled={cepLoading}
          />
          {cepLoading && <p className="mt-1 text-xs text-muted">Buscando endereço pelo CEP...</p>}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            rows={2}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <ConfirmPopup
        open={!!dup}
        title="Cadastro duplicado"
        message={dup?.message ?? ""}
        confirmText="Abrir existente"
        onCancel={() => setDup(null)}
        onConfirm={() => { if (dup?.existingId) { router.push(`/empreendimentos/${dup.existingId}`); router.refresh(); } setDup(null); }}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : empreendimentoId ? "Salvar alterações" : "Criar empreendimento"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
