"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function AreaForm({
  initial,
  areaId,
}: {
  initial?: {
    nome?: string;
    tipo?: string;
    matricula?: string;
    areaHa?: number;
    municipio?: string;
    uf?: string;
    situacao?: string;
    coordenadas?: string;
    observacoes?: string;
  };
  areaId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    tipo: initial?.tipo ?? "imovel",
    matricula: initial?.matricula ?? "",
    areaHa: initial?.areaHa?.toString() ?? "",
    municipio: initial?.municipio ?? "",
    uf: initial?.uf ?? "",
    situacao: initial?.situacao ?? "ativa",
    coordenadas: initial?.coordenadas ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...form,
      areaHa: form.areaHa ? Number(form.areaHa) : null,
    };

    const res = await fetch(areaId ? `/api/areas/${areaId}` : "/api/areas", {
      method: areaId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/areas/${data.id}`);
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
            <option value="imovel">Imóvel</option>
            <option value="gleba">Gleba</option>
            <option value="poligonal">Poligonal</option>
            <option value="outro">Outro</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="situacao">Situação</Label>
          <Select
            id="situacao"
            value={form.situacao}
            onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}
          >
            <option value="ativa">Ativa</option>
            <option value="disponivel">Disponível</option>
            <option value="pendente">Pendente</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="matricula">Matrícula</Label>
          <Input
            id="matricula"
            value={form.matricula}
            onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="areaHa">Área (ha)</Label>
          <Input
            id="areaHa"
            type="number"
            step="0.01"
            value={form.areaHa}
            onChange={(e) => setForm((f) => ({ ...f, areaHa: e.target.value }))}
          />
        </div>
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
        <div className="md:col-span-2">
          <Label htmlFor="coordenadas">Coordenadas</Label>
          <Input
            id="coordenadas"
            value={form.coordenadas}
            onChange={(e) => setForm((f) => ({ ...f, coordenadas: e.target.value }))}
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
          {loading ? "Salvando..." : areaId ? "Salvar alterações" : "Criar área"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
