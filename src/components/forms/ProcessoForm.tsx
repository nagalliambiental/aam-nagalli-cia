"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

const FASES_VALIDAS = [
  "Requerimento de Pesquisa",
  "Autorização de Pesquisa",
  "Direito de Requerer a Lavra",
  "Requerimento de Lavra",
  "Concessão de Lavra",
];

function normalizarFase(fase: string): string | null {
  const f = fase.toLowerCase();
  const mapeia: [RegExp, string][] = [
    [/\brequerimento.*pesquisa\b/, "Requerimento de Pesquisa"],
    [/\bautoriza.+\bpesquisa\b|\bauth\b.*\bpesquisa\b/, "Autorização de Pesquisa"],
    [/direito de requerer a lavra/, "Direito de Requerer a Lavra"],
    [/\brequerimento.*lavra\b/, "Requerimento de Lavra"],
    [/\bconcess.+\blavra\b|\blavra\b/, "Concessão de Lavra"],
    [/\bpesquisa\b/, "Autorização de Pesquisa"],
  ];
  for (const [re, valor] of mapeia) {
    if (re.test(f)) return valor;
  }
  return FASES_VALIDAS.includes(fase.trim()) ? fase.trim() : null;
}

// ArcGIS REST API suporta JSONP (callback) - contorna CORS e roda direto no navegador do usuário
function jsonp(url: string, timeoutMs = 9000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cbName = `__anm_${Date.now()}_${Math.floor(Math.random() * 99999)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete (globalThis as unknown as Record<string, unknown>)[cbName];
      script.remove();
    };
    (globalThis as unknown as Record<string, (d: unknown) => void>)[cbName] = (data: unknown) => {
      cleanup();
      resolve(data);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, timeoutMs);
    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error("error"));
    };
    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${cbName}`;
    document.head.appendChild(script);
  });
}

// Consulta SIGMINE direto do navegador (sem depender do servidor/Vercel)
async function consultaSigmineBrowser(numero: string): Promise<{
  areaHa: number | null;
  fase: string | null;
  substancias: string | null;
  titular: string | null;
  uf: string | null;
  processoSigmine: string | null;
} | null> {
  const m2 = numero.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  if (!m2) return null;
  const num = m2[1] + m2[2];
  const ano = m2[3];
  try {
    const url =
      "https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/FeatureServer/0/query";
    const params = new URLSearchParams({
      where: `NUMERO=${num} AND ANO=${ano}`,
      outFields: "PROCESSO,NUMERO,ANO,FASE,NOME,SUBS,USO,AREA_HA,UF,ULT_EVENTO",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "5",
    });
    const data = (await jsonp(`${url}?${params}`)) as {
      features?: { attributes?: Record<string, unknown> }[];
    };
    const feats = data?.features;
    if (!feats?.length) return null;
    const a = feats[0].attributes ?? {};
    return {
      areaHa: a.AREA_HA != null ? Number(a.AREA_HA) : null,
      fase: a.FASE ? normalizarFase(String(a.FASE)) : null,
      substancias: a.SUBS ? String(a.SUBS) : null,
      titular: a.NOME ? String(a.NOME) : null,
      uf: a.UF ? String(a.UF) : null,
      processoSigmine: a.PROCESSO ? String(a.PROCESSO) : null,
    };
  } catch {
    return null;
  }
}

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
    natureza?: string;
    assunto?: string;
    fase?: string;
    status?: string;
    areaValor?: number | null;
    areaUnidade?: string;
    substancias?: string;
    guiaUtilizacao?: boolean;
    numeroLicenca?: string;
    numeroProtocolo?: string;
    atividade?: string;
    modalidade?: string;
    modalidadeOutra?: string;
    orgaoAmbiental?: string;
    orgaoAmbientalOutro?: string;
    validade?: string;
    dataProtocolo?: string;
    alertaDias?: number;
    condicionantes?: string;
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
    orgaoId: initial?.orgaoId ?? "",
    empreendimentoId: String(initial?.empreendimentoId ?? ""),
    natureza: initial?.natureza ?? "minerario",
    fase: initial?.fase ?? "",
    status: initial?.status ?? "em_andamento",
    areaValor: initial?.areaValor != null ? String(initial.areaValor) : "",
    areaUnidade: initial?.areaUnidade ?? "ha",
    substancias: initial?.substancias ?? "",
    guiaUtilizacao: initial?.guiaUtilizacao === true,
    // ambientais
    numeroLicenca: initial?.numeroLicenca ?? "",
    numeroProtocolo: initial?.numeroProtocolo ?? "",
    atividade: initial?.atividade ?? "",
    modalidade: initial?.modalidade ?? "",
    modalidadeOutra: initial?.modalidadeOutra ?? "",
    orgaoAmbiental: initial?.orgaoAmbiental ?? "",
    orgaoAmbientalOutro: initial?.orgaoAmbientalOutro ?? "",
    validade: initial?.validade ?? "",
    dataProtocolo: initial?.dataProtocolo ?? "",
    alertaDias: initial?.alertaDias != null ? String(initial.alertaDias) : "",
    condicionantes: initial?.condicionantes ?? "",
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

  // OCR gratuito no navegador: preenche o código do captcha automaticamente (Tesseract.js)
  const [cmOcr, setCmOcr] = useState(false);
  async function automatizarCaptcha() {
    if (!cmCaptcha) return;
    setCmOcr(true);
    setCmMsg("Lendo captcha automaticamente...");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({ tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" });
      const { data } = await worker.recognize(cmCaptcha);
      await worker.terminate();
      const txt = (data.text ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4);
      if (txt.length === 4) {
        setCmCodigo(txt);
        setCmMsg(`Código detectado: ${txt.toUpperCase()}. Revise e confirme.`);
        setCmOcr(false);
        return;
      }
      setCmMsg("Não consegui ler o captcha. Digite o código da imagem manualmente.");
    } catch {
      setCmMsg("OCR indisponível. Digite o código da imagem manualmente.");
    } finally {
      setCmOcr(false);
    }
  }

  // Dispara o OCR assim que o popup recebe a imagem
  useEffect(() => {
    if (cmPopupOpen && cmCaptcha) {
      automatizarCaptcha();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmPopupOpen, cmCaptcha]);

  async function buscarCadastroMineiro(codigoOverride?: string) {
    if (!form.numero.trim()) { setCmMsg("Informe o número do processo primeiro."); return; }
    setCmLoading(true);
    setCmMsg(null);
    setCmCaptcha(null);

    // 1) Tentativa automática direto no navegador via SIGMINE (dados abertos ANM, JSONP)
    if (!codigoOverride) {
      const sig = await consultaSigmineBrowser(form.numero);
      if (sig && (sig.areaHa != null || sig.fase || sig.processoSigmine)) {
        const updates: Partial<typeof form> = {};
        if (sig.areaHa != null) {
          updates.areaValor = String(sig.areaHa);
          updates.areaUnidade = "ha";
        }
        if (sig.fase) updates.fase = sig.fase;
        if (sig.substancias) updates.substancias = sig.substancias;
        if (Object.keys(updates).length > 0) setForm((f) => ({ ...f, ...updates }));
        const obs = `[ANM] ${sig.titular ?? ""} - Substância: ${sig.substancias ?? ""} - Processo ANM: ${sig.processoSigmine ?? form.numero}`.replace(/\s+/g, " ").trim();
        if (obs.trim() !== "[ANM]") {
          setForm((f) => ({ ...f, observacoes: f.observacoes ? `${f.observacoes}\n${obs}` : obs }));
        }
        const extras: string[] = [];
        if (sig.areaHa != null) extras.push(`${sig.areaHa} ha`);
        if (sig.fase) extras.push(`Fase ${sig.fase}`);
        if (sig.substancias) extras.push(sig.substancias);
        if (sig.uf) extras.push(sig.uf);
        if (!form.nup.trim()) {
          // SIGMINE não fornece NUP: continua para o backend (Cadastro Mineiro) só para o NUP
          setCmMsg(`Dados da ANM preenchidos. Para preencher o NUP, resolva o captcha abaixo.`);
        } else {
          setCmMsg(`Preenchido automaticamente (SIGMINE/ANM): ${extras.join(" · ")}`);
          setCmLoading(false);
          return;
        }
      }
    }

    // 2) Fallback: backend (popup captcha manual do Cadastro Mineiro)
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
        setCmSession(d.cookies ? { cookies: d.cookies, viewState: d.viewState, viewStateGen: d.viewStateGen, eventValidation: d.eventValidation } : cmSession);
        setCmPopupOpen(true);
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
      if (d.substancias) updates.substancias = d.substancias;
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
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
      natureza: form.natureza,
      guiaUtilizacao: form.natureza === "minerario" && form.guiaUtilizacao,
      areaValor: form.areaValor !== "" ? Number(String(form.areaValor).replace(",", ".")) : null,
      validade: form.validade ? new Date(form.validade) : null,
      dataProtocolo: form.dataProtocolo ? new Date(form.dataProtocolo) : null,
      alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : null,
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
      if (res.status === 409 && data.existingId) {
        router.push(`/processos/${data.existingId}`);
        router.refresh();
        return;
      }
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/processos/${data.id}`);
    router.refresh();
  }

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  const MODALIDADES = ["Licença Prévia", "Licença de Instalação", "Licença de Operação", "Licença de Operação e Regularização", "Autorização Ambiental", "Outro"];
  const ORGAOS_AMB = ["SMMA", "IAT", "IMA", "FATMA", "IBAMA", "Prefeitura", "Outro"];

  // Import de condicionantes via PDF -> texto (usa a rota /api/processos/import-condicionantes)
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);
  async function importarCondicionantes(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    setPdfMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/processos/import-condicionantes", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.texto) {
        setForm((f) => ({ ...f, condicionantes: f.condicionantes ? `${f.condicionantes}\n${d.texto}` : d.texto }));
        setPdfMsg("Condicionantes extraídas do PDF.");
      } else {
        setPdfMsg(d.error ?? "Não foi possível extrair o texto do PDF.");
      }
    } catch {
      setPdfMsg("Erro ao processar PDF.");
    } finally {
      setPdfLoading(false);
      e.target.value = "";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
        <div className="md:col-span-2">
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
        <div className="md:col-span-2">
          <Label>Natureza do processo</Label>
          <div className="flex overflow-hidden rounded-md ring-1 ring-slate-200">
            {(["minerario", "ambiental"] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm((f) => ({ ...f, natureza: n }))}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  form.natureza === n
                    ? n === "ambiental"
                      ? "bg-emerald-600 text-white"
                      : "bg-navy-700 text-white"
                    : "bg-white text-muted hover:bg-slate-50"
                }`}
              >
                {n === "minerario" ? "Processo Minerário" : "Processo Ambiental"}
              </button>
            ))}
          </div>
        </div>

        {form.natureza === "minerario" ? (
          <>
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
              <Input id="nup" value={form.nup} onChange={set("nup")} placeholder="48051.000000/0000-00" />
              <p className="mt-1 text-xs text-muted">17 dígitos: 48xxx.000000/AAAA-DV</p>
            </div>
            <div>
              <Label htmlFor="orgaoId" required>Órgão</Label>
              <Select id="orgaoId" value={String(form.orgaoId)} onChange={(e) => setForm((f) => ({ ...f, orgaoId: e.target.value as unknown as number }))} required>
                {orgaos.map((o) => (
                  <option key={o.id} value={o.id}>{o.sigla} — {o.nome}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fase">Fase (regime Autorização → Concessão)</Label>
              <Select id="fase" value={form.fase} onChange={set("fase")}>
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
              <Select id="status" value={form.status} onChange={set("status")}>
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
              <Input id="areaValor" type="number" step="any" min="0" value={form.areaValor} onChange={set("areaValor")} placeholder="0,00" />
            </div>
            <div>
              <Label htmlFor="areaUnidade">Unidade</Label>
              <Select id="areaUnidade" value={form.areaUnidade} onChange={set("areaUnidade")}>
                <option value="ha">Hectare (ha)</option>
                <option value="m²">Metro quadrado (m²)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="substancias">Substâncias</Label>
              <Input id="substancias" value={form.substancias} onChange={set("substancias")} placeholder="Ex: Basalto (Brita)" />
              <p className="mt-1 text-xs text-muted">Preenchido automaticamente no Buscar CM.</p>
            </div>
            <div>
              <Label htmlFor="dataAbertura">Data de abertura</Label>
              <Input id="dataAbertura" type="date" value={form.dataAbertura} onChange={set("dataAbertura")} />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input
                  type="checkbox"
                  checked={form.guiaUtilizacao}
                  onChange={setCheck("guiaUtilizacao")}
                  className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                />
                Guia de Utilização
              </label>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={form.descricao} onChange={set("descricao")} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={form.observacoes} onChange={set("observacoes")} rows={2} />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="numero">Número do processo</Label>
              <Input id="numero" value={form.numero} onChange={set("numero")} placeholder="000.000/0000" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={set("status")}>
                <option value="em_andamento">Em andamento</option>
                <option value="ativo">Ativo</option>
                <option value="pendente">Pendente</option>
                <option value="arquivado">Arquivado</option>
                <option value="cancelado">Cancelado</option>
                <option value="encerrado">Encerrado</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="numeroLicenca">Nº Licença</Label>
              <Input id="numeroLicenca" value={form.numeroLicenca} onChange={set("numeroLicenca")} placeholder="Digitado o nº, consulta IAT/IMA" />
            </div>
            <div>
              <Label htmlFor="numeroProtocolo">Nº Protocolo</Label>
              <Input id="numeroProtocolo" value={form.numeroProtocolo} onChange={set("numeroProtocolo")} />
            </div>
            <div>
              <Label htmlFor="atividade">Atividade</Label>
              <Input id="atividade" value={form.atividade} onChange={set("atividade")} />
            </div>
            <div>
              <Label htmlFor="modalidade">Modalidade</Label>
              <Select id="modalidade" value={form.modalidade} onChange={set("modalidade")}>
                <option value="">— selecione —</option>
                {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            {form.modalidade === "Outro" && (
              <div className="md:col-span-2">
                <Label htmlFor="modalidadeOutra">Modalidade (outra)</Label>
                <Input id="modalidadeOutra" value={form.modalidadeOutra} onChange={set("modalidadeOutra")} />
              </div>
            )}
            <div>
              <Label htmlFor="orgaoAmbiental">Órgão</Label>
              <Select id="orgaoAmbiental" value={form.orgaoAmbiental} onChange={set("orgaoAmbiental")}>
                <option value="">— selecione —</option>
                {ORGAOS_AMB.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </div>
            {form.orgaoAmbiental === "Outro" && (
              <div className="md:col-span-2">
                <Label htmlFor="orgaoAmbientalOutro">Órgão (outro)</Label>
                <Input id="orgaoAmbientalOutro" value={form.orgaoAmbientalOutro} onChange={set("orgaoAmbientalOutro")} />
              </div>
            )}
            <div>
              <Label htmlFor="validade">Validade</Label>
              <Input id="validade" type="date" value={form.validade} onChange={set("validade")} />
            </div>
            <div>
              <Label htmlFor="dataProtocolo">Data Protocolo</Label>
              <Input id="dataProtocolo" type="date" value={form.dataProtocolo} onChange={set("dataProtocolo")} />
            </div>
            <div>
              <Label htmlFor="alertaDias">Alerta (dias antes do vencimento)</Label>
              <Input id="alertaDias" type="number" min="0" value={form.alertaDias} onChange={set("alertaDias")} />
            </div>
            <div>
              <Label htmlFor="dataAbertura">Data de abertura</Label>
              <Input id="dataAbertura" type="date" value={form.dataAbertura} onChange={set("dataAbertura")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="condicionantes">Condicionantes</Label>
              <div className="flex items-center gap-2">
                <Textarea id="condicionantes" value={form.condicionantes} onChange={set("condicionantes")} rows={4} className="flex-1" />
                <label className="cursor-pointer whitespace-nowrap rounded-md bg-white px-3 py-2 text-sm font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
                  {pdfLoading ? "Lendo..." : "Importar PDF"}
                  <input type="file" accept=".pdf" className="hidden" onChange={importarCondicionantes} disabled={pdfLoading} />
                </label>
              </div>
              {pdfMsg && <p className="mt-1 text-xs text-muted">{pdfMsg}</p>}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={form.observacoes} onChange={set("observacoes")} rows={2} />
            </div>
          </>
        )}
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
            <p className="mt-1 text-sm text-muted">Resolva o captcha para buscar automaticamente os dados do processo na ANM.</p>
            <div className="mt-4 flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cmCaptcha} alt="captcha" className="h-12 rounded border border-slate-300 bg-white" />
            </div>
            <Input
              value={cmCodigo}
              onChange={(e) => setCmCodigo(e.target.value)}
              placeholder="Código da imagem"
              maxLength={6}
              className="mt-4 text-center text-lg tracking-[0.3em]"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmarCaptcha(); } }}
            />
            {cmMsg && <p className="mt-2 text-xs text-muted">{cmMsg}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setCmPopupOpen(false); setCmCaptcha(null); setCmCodigo(""); }} disabled={cmLoading}>
                Cancelar
              </Button>
              <Button type="button" variant="secondary" onClick={automatizarCaptcha} disabled={cmOcr || cmLoading}>
                {cmOcr ? "Lendo..." : "Ler código"}
              </Button>
              <Button type="button" onClick={confirmarCaptcha} disabled={cmLoading || !cmCodigo}>
                {cmLoading ? "Buscando..." : "Buscar dados"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
