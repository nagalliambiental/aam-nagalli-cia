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
    nup?: string;
    orgaoId?: number;
    tipoProcessoId?: number;
    empreendimentoId?: number | null;
    assunto?: string;
    fase?: string;
    status?: string;
    areaValor?: number | null;
    areaUnidade?: string;
    dataAbertura?: string;
    descricao?: string;
    observacoes?: string;
  };
  processoId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    numero: initial?.numero ?? "",
    nup: initial?.nup ?? "",
    orgaoId: initial?.orgaoId ?? orgaos[0]?.id ?? "",
    tipoProcessoId: initial?.tipoProcessoId ?? tipos[0]?.id ?? "",
    empreendimentoId: String(initial?.empreendimentoId ?? ""),
    assunto: initial?.assunto ?? "",
    fase: initial?.fase ?? "",
    status: initial?.status ?? "em_andamento",
    areaValor: initial?.areaValor != null ? String(initial.areaValor) : "",
    areaUnidade: initial?.areaUnidade ?? "ha",
    dataAbertura: initial?.dataAbertura ?? new Date().toISOString().slice(0, 10),
    descricao: initial?.descricao ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cmLoading, setCmLoading] = useState(false);
  const [cmMsg, setCmMsg] = useState<string | null>(null);
  const [cmCaptcha, setCmCaptcha] = useState<string | null>(null);
  const [cmCodigo, setCmCodigo] = useState("");
  const [cmSession, setCmSession] = useState<{ cookies: string; viewState: string; viewStateGen: string; eventValidation: string } | null>(null);
  const [cmPopupOpen, setCmPopupOpen] = useState(false);

  async function buscarCadastroMineiro(codigoOverride?: string) {
    if (!form.numero.trim()) { setCmMsg("Informe o número do processo primeiro."); return; }
    setCmLoading(true);
    setCmMsg(null);
    setCmCaptcha(null);
    try {
      const res = await fetch("/api/processos/cadastro-mineiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: form.numero,
          codigo: codigoOverride ?? undefined,
          // reenvia a sessão do popup para a consulta com o código digitado
          ...(cmSession && { cookies: cmSession.cookies, viewState: cmSession.viewState, viewStateGen: cmSession.viewStateGen, eventValidation: cmSession.eventValidation }),
        }),
      });
      const d = await res.json();
      if (d.modo === "captcha_manual" && d.captchaBase64) {
        setCmCaptcha(d.captchaBase64);
        setCmMsg(d.mensagem ?? "Digite o código da imagem.");
        return;
      }
      if (d.modo === "captcha_popup" && d.captchaUrl) {
        setCmCaptcha(d.captchaUrl);
        setCmSession({ cookies: d.cookies, viewState: d.viewState, viewStateGen: d.viewStateGen, eventValidation: d.eventValidation });
        setCmPopupOpen(true);
        setCmMsg("");
        return;
      }
      if (d.modo === "manual_fallback") {
        setCmPopupOpen(false);
        setCmSession(null);
        setCmMsg(d.mensagem ?? "Preencha NUP e área manualmente e salve.");
        return;
      }
      if (!res.ok) {
        setCmPopupOpen(false);
        setCmSession(null);
        setCmMsg(d.error ?? d.mensagem ?? "Não foi possível consultar o Cadastro Mineiro.");
        return;
      }
      const updates: Partial<typeof form> = {};
      if (d.nup) updates.nup = d.nup;
      if (d.fase) updates.fase = d.fase;
      if (d.areaHa != null) {
        updates.areaValor = String(d.areaHa);
        updates.areaUnidade = "ha";
      }
      if (Object.keys(updates).length === 0) {
        setCmMsg("Consulta OK, mas sem dados novos para preencher.");
        return;
      }
      setForm((f) => ({ ...f, ...updates }));
      const extras: string[] = [];
      if (d.nup) extras.push(`NUP ${d.nup}`);
      if (d.areaHa) extras.push(`${d.areaHa} ha`);
      if (d.substancias) extras.push(d.substancias);
      if (d.fase) extras.push(`Fase ${d.fase}`);
      if (d.uf) extras.push(d.uf);
      if (d.modo === "sigmine") {
        const obs = `[ANM] ${d.titular ?? ""} - Substância: ${d.substancias ?? ""} - Processo ANM: ${d.processoSigmine ?? form.numero}`.replace(/\s+/g, " ").trim();
        setForm((f) => ({ ...f, observacoes: f.observacoes ? `${f.observacoes}\n${obs}` : obs }));
        extras.push("dados abertos ANM");
      }
      setCmMsg(`Preenchido: ${extras.join(" · ")}`);
      setCmCaptcha(null);
      setCmCodigo("");
      setCmPopupOpen(false);
      setCmSession(null);
    } catch {
      setCmMsg("Erro ao consultar Cadastro Mineiro.");
    } finally {
      setCmLoading(false);
    }
  }

  function confirmarCaptcha() {
    if (!cmCodigo.trim()) { setCmMsg("Digite o código da imagem."); return; }
    buscarCadastroMineiro(cmCodigo.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...form,
      orgaoId: form.orgaoId ? Number(form.orgaoId) : null,
      tipoProcessoId: form.tipoProcessoId ? Number(form.tipoProcessoId) : null,
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
      areaValor: form.areaValor !== "" ? Number(String(form.areaValor).replace(",", ".")) : null,
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
          <div className="flex gap-2">
            <Input
              id="numero"
              value={form.numero}
              onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              placeholder="000.000/0000"
              required
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={() => buscarCadastroMineiro()} disabled={cmLoading}>
              {cmLoading ? "Buscando..." : "Buscar CM"}
            </Button>
          </div>
          {cmMsg && <p className="mt-1 text-xs text-muted">{cmMsg}</p>}
        </div>
        <div>
          <Label htmlFor="nup">NUP (SEI)</Label>
          <Input
            id="nup"
            value={form.nup}
            onChange={(e) => setForm((f) => ({ ...f, nup: e.target.value }))}
            placeholder="48051.000000/0000-00"
          />
          <p className="mt-1 text-xs text-muted">17 dígitos: 48xxx.000000/AAAA-DV</p>
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
          <Label htmlFor="areaValor">Área</Label>
          <Input
            id="areaValor"
            type="number"
            step="any"
            min="0"
            value={form.areaValor}
            onChange={(e) => setForm((f) => ({ ...f, areaValor: e.target.value }))}
            placeholder="0,00"
          />
        </div>
        <div>
          <Label htmlFor="areaUnidade">Unidade</Label>
          <Select
            id="areaUnidade"
            value={form.areaUnidade}
            onChange={(e) => setForm((f) => ({ ...f, areaUnidade: e.target.value }))}
          >
            <option value="ha">Hectare (ha)</option>
            <option value="m²">Metro quadrado (m²)</option>
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

      {cmPopupOpen && cmCaptcha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-navy-900">Cadastro Mineiro</h3>
            <p className="mt-1 text-sm text-muted">Digite o código da imagem para buscar automaticamente os dados do processo.</p>
            <div className="mt-4 flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cmCaptcha} alt="captcha" className="h-12 rounded border border-slate-300 bg-white" />
            </div>
            <Input
              value={cmCodigo}
              onChange={(e) => setCmCodigo(e.target.value)}
              placeholder="Código (4 dígitos)"
              maxLength={4}
              className="mt-4 text-center text-lg tracking-[0.3em]"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmarCaptcha(); } }}
            />
            {cmMsg && <p className="mt-2 text-xs text-muted">{cmMsg}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setCmPopupOpen(false); setCmCaptcha(null); setCmCodigo(""); }} disabled={cmLoading}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmarCaptcha} disabled={cmLoading || !cmCodigo}>
                {cmLoading ? "Buscando..." : "Buscar preenchimento automático"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
