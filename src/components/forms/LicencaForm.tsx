"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function LicencaForm({
  orgaos,
  tiposLicenca,
  empreendimentos,
  pessoas,
  initial,
  licencaId,
}: {
  orgaos: { id: number; sigla: string }[];
  tiposLicenca: { id: number; nome: string }[];
  empreendimentos: { id: number; nome: string }[];
  pessoas: { id: number; nome: string }[];
  initial?: {
    tipoLicencaId?: number;
    numero?: string;
    orgaoId?: number;
    empreendimentoId?: number | null;
    dataEmissao?: string;
    dataValidade?: string;
    situacao?: string;
    observacoes?: string;
    responsavelPessoaId?: number | null;
  };
  licencaId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    tipoLicencaId: String(initial?.tipoLicencaId ?? tiposLicenca[0]?.id ?? ""),
    numero: initial?.numero ?? "",
    orgaoId: String(initial?.orgaoId ?? orgaos[0]?.id ?? ""),
    empreendimentoId: String(initial?.empreendimentoId ?? ""),
    dataEmissao: initial?.dataEmissao ?? "",
    dataValidade: initial?.dataValidade ?? "",
    situacao: initial?.situacao ?? "ativa",
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
      tipoLicencaId: form.tipoLicencaId ? Number(form.tipoLicencaId) : null,
      orgaoId: form.orgaoId ? Number(form.orgaoId) : null,
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
      responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
      dataEmissao: form.dataEmissao ? new Date(form.dataEmissao) : null,
      dataValidade: form.dataValidade ? new Date(form.dataValidade) : null,
    };

    const res = await fetch(licencaId ? `/api/licencas/${licencaId}` : "/api/licencas", {
      method: licencaId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/licencas/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
        <div>
          <Label htmlFor="tipoLicencaId" required>Tipo</Label>
          <Select
            id="tipoLicencaId"
            value={form.tipoLicencaId}
            onChange={(e) => setForm((f) => ({ ...f, tipoLicencaId: e.target.value }))}
            required
          >
            {tiposLicenca.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </Select>
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
          <Select
            id="orgaoId"
            value={form.orgaoId}
            onChange={(e) => setForm((f) => ({ ...f, orgaoId: e.target.value }))}
            required
          >
            {orgaos.map((o) => (
              <option key={o.id} value={o.id}>{o.sigla}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="empreendimentoId">Empreendimento</Label>
          <Select
            id="empreendimentoId"
            value={form.empreendimentoId}
            onChange={(e) => setForm((f) => ({ ...f, empreendimentoId: e.target.value }))}
          >
            <option value="">— sem vínculo —</option>
            {empreendimentos.map((x) => (
              <option key={x.id} value={x.id}>{x.nome}</option>
            ))}
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
            <option value="em_analise">Em análise</option>
            <option value="suspensa">Suspensa</option>
            <option value="vencida">Vencida</option>
          </Select>
        </div>
        <div className={grid}>
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
            <Label htmlFor="dataValidade">Validade</Label>
            <Input
              id="dataValidade"
              type="date"
              value={form.dataValidade}
              onChange={(e) => setForm((f) => ({ ...f, dataValidade: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="responsavelPessoaId">Responsável</Label>
          <Select
            id="responsavelPessoaId"
            value={form.responsavelPessoaId}
            onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))}
          >
            <option value="">— sem responsável —</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </Select>
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
          {loading ? "Salvando..." : licencaId ? "Salvar alterações" : "Criar licença"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
