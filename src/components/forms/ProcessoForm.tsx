"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export type OrgaoOpt = { id: number; sigla: string; nome: string };
export type TipoOpt = { id: number; nome: string };
export type EmpOpt = { id: number; nome: string };

export function ProcessoForm({
  orgaos,
  tipos,
  empreendimentos,
  initial,
  processoId,
}: {
  orgaos: OrgaoOpt[];
  tipos: TipoOpt[];
  empreendimentos: EmpOpt[];
  initial?: {
    numero?: string;
    orgaoId?: number;
    tipoProcessoId?: number;
    empreendimentoId?: number | null;
    assunto?: string;
    fase?: string;
    status?: string;
    dataAbertura?: string;
    descricao?: string;
    observacoes?: string;
  };
  processoId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    numero: initial?.numero ?? "",
    orgaoId: initial?.orgaoId ?? orgaos[0]?.id ?? "",
    tipoProcessoId: initial?.tipoProcessoId ?? tipos[0]?.id ?? "",
    empreendimentoId: String(initial?.empreendimentoId ?? ""),
    assunto: initial?.assunto ?? "",
    fase: initial?.fase ?? "",
    status: initial?.status ?? "em_andamento",
    dataAbertura: initial?.dataAbertura ?? new Date().toISOString().slice(0, 10),
    descricao: initial?.descricao ?? "",
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
      orgaoId: form.orgaoId ? Number(form.orgaoId) : null,
      tipoProcessoId: form.tipoProcessoId ? Number(form.tipoProcessoId) : null,
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
      dataAbertura: form.dataAbertura ? new Date(form.dataAbertura) : null,
    };

    const res = await fetch(
      processoId ? `/api/processos/${processoId}` : "/api/processos",
      {
        method: processoId ? "PATCH" : "POST",
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
    router.push(`/processos/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
        <div>
          <Label htmlFor="numero" required>Número do processo</Label>
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
            value={String(form.orgaoId)}
            onChange={(e) => setForm((f) => ({ ...f, orgaoId: e.target.value as unknown as number }))}
            required
          >
            {orgaos.map((o) => (
              <option key={o.id} value={o.id}>{o.sigla} — {o.nome}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tipoProcessoId" required>Tipo de processo</Label>
          <Select
            id="tipoProcessoId"
            value={String(form.tipoProcessoId)}
            onChange={(e) => setForm((f) => ({ ...f, tipoProcessoId: e.target.value as unknown as number }))}
            required
          >
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
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
          <Label htmlFor="assunto">Assunto</Label>
          <Input
            id="assunto"
            value={form.assunto}
            onChange={(e) => setForm((f) => ({ ...f, assunto: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="fase">Fase (regime Autorização → Concessão)</Label>
          <Select
            id="fase"
            value={form.fase}
            onChange={(e) => setForm((f) => ({ ...f, fase: e.target.value }))}
          >
            <option value="">— selecione —</option>
            <option value="Requerimento de Pesquisa">Requerimento de Pesquisa</option>
            <option value="Autorização de Pesquisa">Autorização de Pesquisa (Alvará)</option>
            <option value="Direito de Requerer a Lavra">Direito de Requerer a Lavra</option>
            <option value="Requerimento de Lavra">Requerimento de Lavra</option>
            <option value="Concessão de Lavra">Concessão de Lavra</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="em_andamento">Em andamento</option>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="arquivado">Arquivado</option>
            <option value="cancelado">Cancelado</option>
            <option value="encerrado">Encerrado</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="dataAbertura">Data de abertura</Label>
          <Input
            id="dataAbertura"
            type="date"
            value={form.dataAbertura}
            onChange={(e) => setForm((f) => ({ ...f, dataAbertura: e.target.value }))}
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
          {loading ? "Salvando..." : processoId ? "Salvar alterações" : "Criar processo"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
