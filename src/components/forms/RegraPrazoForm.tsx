"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function RegraPrazoForm({
  orgaos,
  tiposProcesso,
  tiposEvento,
  tiposTitulo,
  tiposLicenca,
  initial,
  regraId,
}: {
  orgaos: { id: number; sigla: string }[];
  tiposProcesso: { id: number; nome: string }[];
  tiposEvento: { id: number; nome: string }[];
  tiposTitulo: { id: number; nome: string }[];
  tiposLicenca: { id: number; nome: string }[];
  initial?: {
    orgaoId?: number;
    tipoProcessoId?: number | null;
    tipoEventoId?: number | null;
    tipoTituloId?: number | null;
    tipoLicencaId?: number | null;
    fase?: string;
    condicao?: string;
    quantidade?: number;
    unidade?: string;
    dataFixa?: string;
    acaoGerada?: string;
    tarefaGerada?: string;
    antecedenciaNotificacao?: number;
    ativo?: boolean;
    vigenciaFim?: string;
  };
  regraId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    orgaoId: String(initial?.orgaoId ?? orgaos[0]?.id ?? ""),
    tipoProcessoId: String(initial?.tipoProcessoId ?? ""),
    tipoEventoId: String(initial?.tipoEventoId ?? ""),
    tipoTituloId: String(initial?.tipoTituloId ?? ""),
    tipoLicencaId: String(initial?.tipoLicencaId ?? ""),
    fase: initial?.fase ?? "",
    condicao: initial?.condicao ?? "",
    quantidade: String(initial?.quantidade ?? ""),
    unidade: initial?.unidade ?? "corridos",
    dataFixa: initial?.dataFixa ?? "",
    acaoGerada: initial?.acaoGerada ?? "",
    tarefaGerada: initial?.tarefaGerada ?? "",
    antecedenciaNotificacao: String(initial?.antecedenciaNotificacao ?? ""),
    ativo: initial?.ativo ?? true,
    vigenciaFim: initial?.vigenciaFim ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...form,
      orgaoId: Number(form.orgaoId),
      tipoProcessoId: form.tipoProcessoId ? Number(form.tipoProcessoId) : null,
      tipoEventoId: form.tipoEventoId ? Number(form.tipoEventoId) : null,
      tipoTituloId: form.tipoTituloId ? Number(form.tipoTituloId) : null,
      tipoLicencaId: form.tipoLicencaId ? Number(form.tipoLicencaId) : null,
      quantidade: form.quantidade ? Number(form.quantidade) : null,
      antecedenciaNotificacao: form.antecedenciaNotificacao ? Number(form.antecedenciaNotificacao) : null,
      dataFixa: form.dataFixa ? new Date(form.dataFixa) : null,
      vigenciaFim: form.vigenciaFim ? new Date(form.vigenciaFim) : null,
      ativo: form.ativo,
    };

    const res = await fetch(regraId ? `/api/regras-prazo/${regraId}` : "/api/regras-prazo", {
      method: regraId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/regras-prazo/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
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
          <Label htmlFor="tipoProcessoId">Tipo de processo</Label>
          <Select
            id="tipoProcessoId"
            value={form.tipoProcessoId}
            onChange={(e) => setForm((f) => ({ ...f, tipoProcessoId: e.target.value }))}
          >
            <option value="">(qualquer)</option>
            {tiposProcesso.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tipoEventoId">Tipo de evento</Label>
          <Select
            id="tipoEventoId"
            value={form.tipoEventoId}
            onChange={(e) => setForm((f) => ({ ...f, tipoEventoId: e.target.value }))}
          >
            <option value="">(qualquer)</option>
            {tiposEvento.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </Select>
        </div>
        <div className={grid}>
          <div>
            <Label htmlFor="tipoTituloId">Tipo de título</Label>
            <Select
              id="tipoTituloId"
              value={form.tipoTituloId}
              onChange={(e) => setForm((f) => ({ ...f, tipoTituloId: e.target.value }))}
            >
              <option value="">(qualquer)</option>
              {tiposTitulo.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tipoLicencaId">Tipo de licença</Label>
            <Select
              id="tipoLicencaId"
              value={form.tipoLicencaId}
              onChange={(e) => setForm((f) => ({ ...f, tipoLicencaId: e.target.value }))}
            >
              <option value="">(qualquer)</option>
              {tiposLicenca.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="fase">Fase</Label>
          <Input
            id="fase"
            value={form.fase}
            onChange={(e) => setForm((f) => ({ ...f, fase: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="condicao">Condição</Label>
          <Input
            id="condicao"
            value={form.condicao}
            onChange={(e) => setForm((f) => ({ ...f, condicao: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Prazo</Label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Input
                type="number"
                value={form.quantidade}
                onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))}
                placeholder="Quantidade"
              />
            </div>
            <div>
              <Select
                value={form.unidade}
                onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
              >
                <option value="corridos">dias corridos</option>
                <option value="uteis">dias úteis</option>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={form.dataFixa}
                onChange={(e) => setForm((f) => ({ ...f, dataFixa: e.target.value }))}
                placeholder="ou data fixa"
              />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="acaoGerada">Ação gerada</Label>
          <Select
            id="acaoGerada"
            value={form.acaoGerada}
            onChange={(e) => setForm((f) => ({ ...f, acaoGerada: e.target.value }))}
          >
            <option value="">(nenhuma)</option>
            <option value="recurso">Recurso</option>
            <option value="renovacao">Renovação</option>
            <option value="prorrogacao">Prorrogação</option>
            <option value="pagamento">Pagamento</option>
            <option value="notificacao">Notificação</option>
            <option value="outro">Outro</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="tarefaGerada">Tarefa gerada</Label>
          <Input
            id="tarefaGerada"
            value={form.tarefaGerada}
            onChange={(e) => setForm((f) => ({ ...f, tarefaGerada: e.target.value }))}
            placeholder="ex.: enviar renovação"
          />
        </div>
        <div>
          <Label htmlFor="antecedenciaNotificacao">Antecedência notificação (dias)</Label>
          <Input
            id="antecedenciaNotificacao"
            type="number"
            value={form.antecedenciaNotificacao}
            onChange={(e) => setForm((f) => ({ ...f, antecedenciaNotificacao: e.target.value }))}
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
            />
            Ativa
          </label>
        </div>
        <div>
          <Label htmlFor="vigenciaFim">Fim da vigência</Label>
          <Input
            id="vigenciaFim"
            type="date"
            value={form.vigenciaFim}
            onChange={(e) => setForm((f) => ({ ...f, vigenciaFim: e.target.value }))}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : regraId ? "Salvar alterações" : "Criar regra"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
