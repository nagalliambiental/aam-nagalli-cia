"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function EmpreendimentoForm({
  empresas,
  initial,
  empreendimentoId,
}: {
  empresas: { id: number; razaoSocial: string }[];
  initial?: {
    nome?: string;
    tipo?: string;
    municipio?: string;
    uf?: string;
    endereco?: string;
    status?: string;
    descricao?: string;
    observacoes?: string;
    empresaPrincipalId?: number;
  };
  empreendimentoId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    tipo: initial?.tipo ?? "pedreira",
    municipio: initial?.municipio ?? "",
    uf: initial?.uf ?? "",
    endereco: initial?.endereco ?? "",
    status: initial?.status ?? "ativo",
    descricao: initial?.descricao ?? "",
    observacoes: initial?.observacoes ?? "",
    empresaPrincipalId: String(initial?.empresaPrincipalId ?? empresas[0]?.id ?? ""),
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...form,
      empresaPrincipalId: form.empresaPrincipalId ? Number(form.empresaPrincipalId) : null,
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
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/empreendimentos/${data.id}`);
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
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            id="tipo"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
          >
            <option value="pedreira">Pedreira</option>
            <option value="mina">Mina</option>
            <option value="brita">Britagem</option>
            <option value="areia">Areia/Cascalho</option>
            <option value="outro">Outro</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="empresaPrincipalId" required>Empresa principal</Label>
          <Select
            id="empresaPrincipalId"
            value={form.empresaPrincipalId}
            onChange={(e) => setForm((f) => ({ ...f, empresaPrincipalId: e.target.value }))}
            required
          >
            {empresas.map((x) => (
              <option key={x.id} value={x.id}>{x.razaoSocial}</option>
            ))}
          </Select>
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
            <option value="fechado">Fechado</option>
          </Select>
        </div>
        <div className={grid}>
          <div>
            <Label htmlFor="municipio">Município</Label>
            <Input
              id="municipio"
              value={form.municipio}
              onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input
              id="uf"
              value={form.uf}
              onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
              maxLength={2}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            value={form.endereco}
            onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
          />
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
