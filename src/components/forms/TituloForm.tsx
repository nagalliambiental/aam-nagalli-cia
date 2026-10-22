"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { Selecionar } from "@/components/ui/Selecionar";

export function TituloForm({
  orgaos,
  tiposTitulo,
  pessoas,
  processos,
  initial,
  tituloId,
}: {
  orgaos: { id: number; sigla: string }[];
  tiposTitulo: { id: number; nome: string }[];
  pessoas: { id: number; nome: string }[];
  processos: { id: number; numero: string }[];
  initial?: {
    tipoTituloId?: number;
    numero?: string;
    orgaoId?: number;
    processoId?: number;
    substancia?: string;
    municipio?: string;
    uf?: string;
    dataEmissao?: string;
    validade?: string;
    situacao?: string;
    observacoes?: string;
    responsavelPessoaId?: number | null;
  };
  tituloId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    tipoTituloId: String(initial?.tipoTituloId ?? tiposTitulo[0]?.id ?? ""),
    numero: initial?.numero ?? "",
    orgaoId: String(initial?.orgaoId ?? orgaos[0]?.id ?? ""),
    processoId: String(initial?.processoId ?? processos[0]?.id ?? ""),
    substancia: initial?.substancia ?? "",
    municipio: initial?.municipio ?? "",
    uf: initial?.uf ?? "",
    dataEmissao: initial?.dataEmissao ?? "",
    validade: initial?.validade ?? "",
    situacao: initial?.situacao ?? "ativo",
    observacoes: initial?.observacoes ?? "",
    responsavelPessoaId: String(initial?.responsavelPessoaId ?? ""),
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...form,
      tipoTituloId: form.tipoTituloId ? Number(form.tipoTituloId) : null,
      orgaoId: form.orgaoId ? Number(form.orgaoId) : null,
      processoId: form.processoId ? Number(form.processoId) : null,
      responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
      dataEmissao: form.dataEmissao ? new Date(form.dataEmissao) : null,
      validade: form.validade ? new Date(form.validade) : null,
    };

    if (!payload.processoId) {
      setError("Vincule o título a um processo (títulos nascem dos processos).");
      setLoading(false);
      return;
    }

    const res = await fetch(tituloId ? `/api/titulos/${tituloId}` : "/api/titulos", {
      method: tituloId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(payload.processoId ? `/processos/${payload.processoId}` : `/titulos/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
        <div className="md:col-span-2">
          <Label htmlFor="processoId" required>Processo de origem</Label>
          <Selecionar
            id="processoId"
            value={form.processoId}
            onChange={(v) => setForm((f) => ({ ...f, processoId: v }))}
            opcoes={processos.map((p) => ({ value: String(p.id), label: p.numero }))}
          />
          <p className="mt-1 text-xs text-muted">O título é gerado a partir de um processo.</p>
        </div>
        <div>
          <Label htmlFor="tipoTituloId" required>Tipo</Label>
          <Selecionar
            id="tipoTituloId"
            value={form.tipoTituloId}
            onChange={(v) => setForm((f) => ({ ...f, tipoTituloId: v }))}
            opcoes={tiposTitulo.map((t) => ({ value: String(t.id), label: t.nome }))}
          />
        </div>
        <div>
          <Label htmlFor="numero" required>Número</Label>
          <Input
            id="numero"
            value={form.numero}
            onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="orgaoId" required>Órgão</Label>
          <Selecionar
            id="orgaoId"
            value={form.orgaoId}
            onChange={(v) => setForm((f) => ({ ...f, orgaoId: v }))}
            opcoes={orgaos.map((o) => ({ value: String(o.id), label: o.sigla }))}
          />
        </div>
        <div>
          <Label htmlFor="situacao">Situação</Label>
          <Select
            id="situacao"
            value={form.situacao}
            onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}
          >
            <option value="ativo">Ativo</option>
            <option value="requerimento">Requerimento</option>
            <option value="suspenso">Suspenso</option>
            <option value="extinto">Extinto</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="substancia">Substância</Label>
          <Input
            id="substancia"
            value={form.substancia}
            onChange={(e) => setForm((f) => ({ ...f, substancia: e.target.value }))}
          />
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
        <div>
          <Label htmlFor="dataEmissao">Data de emissão</Label>
          <Input
            id="dataEmissao"
            type="date"
            value={form.dataEmissao}
            onChange={(e) => setForm((f) => ({ ...f, dataEmissao: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="validade">Validade</Label>
          <Input
            id="validade"
            type="date"
            value={form.validade}
            onChange={(e) => setForm((f) => ({ ...f, validade: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="responsavelPessoaId">Responsável</Label>
          <Selecionar
            id="responsavelPessoaId"
            value={form.responsavelPessoaId}
            onChange={(v) => setForm((f) => ({ ...f, responsavelPessoaId: v }))}
            emptyValue=""
            emptyLabel="— sem responsável —"
            opcoes={pessoas.map((p) => ({ value: String(p.id), label: p.nome }))}
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
          {loading ? "Salvando..." : tituloId ? "Salvar alterações" : "Criar título"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
