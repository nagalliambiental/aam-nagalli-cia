"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/processos/StatusBadge";

type ExigenciaItem = {
  id: number;
  descricao: string;
  dataRecebimento: Date;
  prazoResposta: Date | null;
  status: string;
  orgao: { sigla: string };
};

export function ExigenciasPanel({
  processoId,
  exigencias,
}: {
  processoId: number;
  exigencias: ExigenciaItem[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [prazoResposta, setPrazoResposta] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<{ nome: string; descricao: string; prazoDias: number; unidade: string }[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/processos/${processoId}/exigencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao,
        prazoResposta: prazoResposta ? new Date(prazoResposta) : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Erro ao adicionar exigência.");
      return;
    }
    setDescricao("");
    setPrazoResposta("");
    setShow(false);
    router.refresh();
  }

  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    setPdfMsg(null);
    setDrafts([]);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/processos/${processoId}/exigencias/import-pdf`, { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setPdfLoading(false);
    if (!res.ok) {
      setPdfMsg(d.error ?? "Erro ao importar PDF.");
      return;
    }
    setDrafts(d.drafts ?? []);
    setPdfMsg(`${d.drafts?.length ?? 0} rascunho(s) extraído(s) do PDF. Revise e confirme.`);
    e.target.value = "";
  }

  async function handleConfirmDrafts() {
    setPdfLoading(true);
    const res = await fetch(`/api/processos/${processoId}/exigencias/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drafts }),
    });
    const d = await res.json().catch(() => ({}));
    setPdfLoading(false);
    if (!res.ok) {
      setPdfMsg(d.error ?? "Erro ao criar exigências.");
      return;
    }
    setPdfMsg(`${d.created?.length ?? 0} exigência(s) criada(s).`);
    setDrafts([]);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Exigências"
        actions={
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {pdfLoading ? "Importando..." : "Importar PDF"}
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdf} disabled={pdfLoading} />
            </label>
            <Button variant="secondary" onClick={() => setShow((s) => !s)}>
              {show ? "Cancelar" : "+ Exigência"}
            </Button>
          </div>
        }
      />

      {show && (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-200 p-5">
          <div>
            <Label htmlFor="descricao" required>Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              rows={2}
            />
          </div>
          <div className="max-w-xs">
            <Label htmlFor="prazoResposta">Prazo de resposta</Label>
            <Input
              id="prazoResposta"
              type="date"
              value={prazoResposta}
              onChange={(e) => setPrazoResposta(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Adicionar exigência"}
          </Button>
        </form>
      )}
      {pdfMsg && <p className="border-b border-slate-200 bg-amber-50 px-5 py-2 text-sm text-amber-800">{pdfMsg}</p>}

      {drafts.length > 0 && (
        <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-5">
          <h4 className="text-sm font-semibold text-navy-900">Rascunhos do PDF — revise antes de criar</h4>
          {drafts.map((d, i) => (
            <div key={i} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_100px_auto]">
                <div>
                  <Label>Nome</Label>
                  <Input value={d.nome} onChange={(e) => setDrafts((prev) => prev.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))} />
                </div>
                <div>
                  <Label>Prazo (dias)</Label>
                  <Input type="number" min="1" value={String(d.prazoDias)} onChange={(e) => setDrafts((prev) => prev.map((x, idx) => (idx === i ? { ...x, prazoDias: Number(e.target.value) } : x)))} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={d.unidade} onChange={(e) => setDrafts((prev) => prev.map((x, idx) => (idx === i ? { ...x, unidade: e.target.value } : x)))}>
                    <option value="corridos">corridos</option>
                    <option value="uteis">úteis</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" onClick={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}>Remover</Button>
                </div>
              </div>
              <div className="mt-2">
                <Label>Descrição</Label>
                <Textarea value={d.descricao} onChange={(e) => setDrafts((prev) => prev.map((x, idx) => (idx === i ? { ...x, descricao: e.target.value } : x)))} rows={2} />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={handleConfirmDrafts} disabled={pdfLoading}>{pdfLoading ? "Criando..." : `Confirmar ${drafts.length} exigência(s)`}</Button>
            <Button variant="ghost" onClick={() => setDrafts([])}>Descartar</Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-slate-100">
        {exigencias.map((ex) => (
          <li key={ex.id} className="flex items-start justify-between gap-4 px-5 py-3">
            <div>
              <p className="font-medium text-navy-900">{ex.descricao}</p>
              <p className="text-xs text-muted">
                {ex.orgao.sigla} · recebida {formatDate(ex.dataRecebimento)}
                {ex.prazoResposta ? ` · resposta até ${formatDate(ex.prazoResposta)}` : ""}
              </p>
            </div>
            <StatusBadge status={ex.status} />
          </li>
        ))}
        {exigencias.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            Nenhuma exigência.
          </li>
        )}
      </ul>
    </Card>
  );
}
