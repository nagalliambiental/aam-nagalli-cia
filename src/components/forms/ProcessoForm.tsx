"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea, ConfirmPopup } from "@/components/ui";
import { VinculoPicker } from "@/components/processos/VinculoPicker";

const FASES_VALIDAS = [
  "Requerimento de Pesquisa",
  "Alvará de Pesquisa",
  "Direito de Requerer a Lavra",
  "Requerimento de Lavra",
  "Licenciamento",
  "Concessão de Lavra",
];

/** Máscara de número de processo: 000.000/0000 (digita só números). */
function mascararNumeroProcesso(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 10);
  let out = d.slice(0, 3);
  if (d.length > 3) out += "." + d.slice(3, 6);
  if (d.length > 6) out += "/" + d.slice(6, 10);
  return out;
}

function normalizarFase(fase: string): string | null {
  const f = fase.toLowerCase();
  const mapeia: [RegExp, string][] = [
    [/\brequerimento.*pesquisa\b/, "Requerimento de Pesquisa"],
    [/\bautoriza.+\bpesquisa\b|\bauth\b.*\bpesquisa\b/, "Alvará de Pesquisa"],
    [/direito de requerer a lavra/, "Direito de Requerer a Lavra"],
    [/\brequerimento.*lavra\b/, "Requerimento de Lavra"],
    [/\bconcess.+\blavra\b|\blavra\b/, "Concessão de Lavra"],
    [/\bpesquisa\b/, "Alvará de Pesquisa"],
  ];
  for (const [re, valor] of mapeia) {
    if (re.test(f)) return valor;
  }
  return FASES_VALIDAS.includes(fase.trim()) ? fase.trim() : null;
}

export type OrgaoOpt = { id: number; sigla: string; nome: string };
export type TipoOpt = { id: number; nome: string };
export type EmpOpt = { id: number; nome: string; apelido?: string | null };
export type PessoaOpt = { id: number; nome: string };
export type ProcOpt = { id: number; numero: string; fase?: string | null };

export function ProcessoForm({
  orgaos,
  tipos,
  empreendimentos,
  pessoas = [],
  processosMinerarios = [],
  processosAmbientais = [],
  initial,
  processoId,
}: {
  orgaos: OrgaoOpt[];
  tipos: TipoOpt[];
  empreendimentos: EmpOpt[];
  pessoas?: PessoaOpt[];
  processosMinerarios?: ProcOpt[];
  processosAmbientais?: ProcOpt[];
  initial?: {
    numero?: string;
    apelido?: string;
    nup?: string;
    seiUrl?: string;
    orgaoId?: number;
    tipoProcessoId?: number;
    empreendimentoId?: number | null;
    responsavelPessoaId?: number;
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
    dataLimiteRenovacao?: string;
    alertaRenovacaoDias?: number;
    protocoloRenovacao?: string;
    dataProtocoloRenovacao?: string;
    condicionantes?: string;
    dataAbertura?: string;
    descricao?: string;
    observacoes?: string;
    vinculos?: number[];
  };
  processoId?: number;
}) {
  const router = useRouter();
  const ehFaseCustom = !!initial?.fase && !FASES_VALIDAS.includes(initial.fase);
  const [form, setForm] = useState({
    numero: initial?.numero ?? "",
    apelido: initial?.apelido ?? "",
    nup: initial?.nup ?? "",
    seiUrl: initial?.seiUrl ?? "",
    orgaoId: initial?.orgaoId ?? "",
    empreendimentoId: String(initial?.empreendimentoId ?? ""),
    responsavelPessoaId: initial?.responsavelPessoaId != null ? String(initial.responsavelPessoaId) : "",
    natureza: initial?.natureza ?? "minerario",
    fase: ehFaseCustom ? "outro" : (initial?.fase ?? ""),
    faseOutra: ehFaseCustom ? (initial?.fase ?? "") : "",
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
    dataLimiteRenovacao: initial?.dataLimiteRenovacao ?? "",
    alertaRenovacaoDias: initial?.alertaRenovacaoDias != null ? String(initial.alertaRenovacaoDias) : "",
    protocoloRenovacao: initial?.protocoloRenovacao ?? "",
    dataProtocoloRenovacao: initial?.dataProtocoloRenovacao ?? "",
    condicionantes: initial?.condicionantes ?? "",
    dataAbertura: initial?.dataAbertura ?? new Date().toISOString().slice(0, 10),
    descricao: initial?.descricao ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [vinculos, setVinculos] = useState<number[]>(initial?.vinculos ?? []);
  const [error, setError] = useState<string | null>(null);
const [dup, setDup] = useState<{ message: string; existingId?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...form,
      orgaoId: form.orgaoId ? Number(form.orgaoId) : null,
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
      responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
      natureza: form.natureza,
      fase: form.fase === "outro" ? (form.faseOutra.trim() || "outro") : form.fase,
      guiaUtilizacao: form.natureza === "minerario" && form.guiaUtilizacao,
      areaValor: form.areaValor !== "" ? Number(String(form.areaValor).replace(",", ".")) : null,
      validade: form.validade ? new Date(form.validade) : null,
      dataProtocolo: form.dataProtocolo ? new Date(form.dataProtocolo) : null,
      alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : null,
      dataLimiteRenovacao: form.dataLimiteRenovacao ? new Date(form.dataLimiteRenovacao) : null,
      alertaRenovacaoDias: form.alertaRenovacaoDias !== "" ? Number(form.alertaRenovacaoDias) : null,
      protocoloRenovacao: form.protocoloRenovacao || null,
      dataProtocoloRenovacao: form.dataProtocoloRenovacao ? new Date(form.dataProtocoloRenovacao) : null,
      dataAbertura: form.dataAbertura ? new Date(form.dataAbertura) : null,
      vinculos,
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
        setDup({ message: data.error ?? "Já existe um processo cadastrado com este número.", existingId: data.existingId });
        return;
      }
      setError(data?.detail ? `${data?.error ?? "Erro ao salvar."} (${data.detail})` : data?.error ?? "Erro ao salvar.");
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

  // Upload da licença (PDF/imagem) -> extrai campos + condicionantes
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);
  async function importarLicenca(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    setPdfMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/processos/licenca/extrair", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.campos) {
        const c = d.campos;
        setForm((f) => ({
          ...f,
          numeroLicenca: c.numeroLicenca || f.numeroLicenca,
          numeroProtocolo: c.numeroProtocolo || f.numeroProtocolo,
          atividade: c.atividade || f.atividade,
          modalidade: c.modalidade || f.modalidade,
          orgaoAmbiental: c.orgaoSigla || f.orgaoAmbiental,
          validade: c.validade || f.validade,
          dataProtocolo: c.dataProtocolo || f.dataProtocolo,
          condicionantes: c.condicionantes ? `${f.condicionantes ? f.condicionantes + "\n" : ""}${c.condicionantes}` : f.condicionantes,
        }));
        setPdfMsg("Dados extraídos do documento da licença.");
      } else {
        setPdfMsg(d.error ?? "Não foi possível extrair os dados do documento.");
      }
    } catch {
      setPdfMsg("Erro ao processar documento.");
    } finally {
      setPdfLoading(false);
      e.target.value = "";
    }
  }

  // Consulta a licença no IAT (SGA)/IMA pela número/protocolo
  const [buscaLicLoading, setBuscaLicLoading] = useState(false);
  const [buscaLicMsg, setBuscaLicMsg] = useState<string | null>(null);
  async function consultarLicenca() {
    const licenca = form.numeroLicenca.trim();
    const protocolo = form.numeroProtocolo.trim();
    if (!licenca && !protocolo) {
      setBuscaLicMsg("Informe o nº da licença ou do protocolo para consultar.");
      return;
    }
    setBuscaLicLoading(true);
    setBuscaLicMsg(null);
    try {
      const qs = new URLSearchParams();
      if (licenca) qs.set("licenca", licenca);
      if (protocolo) qs.set("protocolo", protocolo);
      if (form.orgaoAmbiental && form.orgaoAmbiental !== "Outro") qs.set("orgao", form.orgaoAmbiental);
      const res = await fetch(`/api/processos/licenca/consulta?${qs.toString()}`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setForm((f) => ({
          ...f,
          numeroLicenca: d.licenca || f.numeroLicenca,
          numeroProtocolo: d.protocolo || f.numeroProtocolo,
          atividade: d.atividade || f.atividade,
          modalidade: d.modalidade || f.modalidade,
          orgaoAmbiental: d.orgaoSigla || f.orgaoAmbiental,
          validade: d.validade || f.validade,
        }));
        setBuscaLicMsg(d.orgao ? `Dados preenchidos (${d.sistema || d.orgao})` : "Dados preenchidos.");
      } else {
        setBuscaLicMsg(d.error ?? "Licença não encontrada no IAT/IMA.");
      }
    } catch {
      setBuscaLicMsg("Falha ao consultar o órgão.");
    } finally {
      setBuscaLicLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={grid}>
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

        <div className="md:col-span-2">
          <Label htmlFor="empreendimentoId">Empreendimento</Label>
          <Select
            id="empreendimentoId"
            value={form.empreendimentoId}
            onChange={(e) => setForm((f) => ({ ...f, empreendimentoId: e.target.value }))}
          >
            <option value="">— sem vínculo —</option>
            {empreendimentos.map((x) => (
              <option key={x.id} value={x.id}>{x.nome}{x.apelido ? ` (${x.apelido})` : ""}</option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="apelido">Apelido do processo</Label>
          <Input id="apelido" value={form.apelido} onChange={set("apelido")} placeholder="Ex.: Pedreira Norte / LO 213" />
        </div>

        {form.natureza === "minerario" ? (
          <>
            <div>
              <Label htmlFor="fase">Fase (regime Autorização → Concessão)</Label>
              <Select id="fase" value={form.fase} onChange={set("fase")}>
                <option value="">— selecione —</option>
                {FASES_VALIDAS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="outro">Outro</option>
              </Select>
            </div>
            {form.fase === "outro" && (
              <div>
                <Label htmlFor="faseOutra">Fase (outra)</Label>
                <Input id="faseOutra" value={form.faseOutra} onChange={(e) => setForm((f) => ({ ...f, faseOutra: e.target.value }))} placeholder="Digite a fase do processo" />
              </div>
            )}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={set("status")}>
                <option value="ativo">Ativo</option>
                <option value="paralisado">Paralisado</option>
                <option value="encerrado">Encerrado</option>
                {!["ativo", "paralisado", "encerrado"].includes(form.status) && <option value={form.status}>{form.status}</option>}
              </Select>
            </div>
            <div>
              <Label htmlFor="numero" required>Número do processo</Label>
              <Input
                id="numero"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: mascararNumeroProcesso(e.target.value) }))}
                placeholder="000.000/0000"
                required
              />
            </div>
            <div>
              <Label htmlFor="nup">NUP (SEI)</Label>
              <Input id="nup" value={form.nup} onChange={set("nup")} placeholder="48051.000000/0000-00" />
              <p className="mt-1 text-xs text-muted">17 dígitos: 48xxx.000000/AAAA-DV</p>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="seiUrl" required>URL vinculado ao SEI</Label>
              <Input id="seiUrl" value={form.seiUrl} onChange={set("seiUrl")} placeholder="https://sei.parana.pr.gov.br/...md_pesq_processo_exibir.php?token=..." required />
              <p className="mt-1 text-xs text-muted">Informe a URL de exibição do processo no SEI (com token).</p>
            </div>
            <div>
              <Label htmlFor="responsavelPessoaId">Responsável técnico</Label>
              <Select id="responsavelPessoaId" value={String(form.responsavelPessoaId)} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))}>
                <option value="">— sem responsável —</option>
                {pessoas.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
              </Select>
            </div>
            <div>
              <Label htmlFor="areaValor">Área</Label>
              <div className="flex gap-2">
                <Input id="areaValor" type="number" step="any" min="0" value={form.areaValor} onChange={set("areaValor")} placeholder="0,00" className="flex-1" />
                <Select id="areaUnidade" value={form.areaUnidade} onChange={set("areaUnidade")} className="w-24">
                  <option value="ha">ha</option>
                  <option value="m²">m²</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="substancias">Substâncias</Label>
              <Input id="substancias" value={form.substancias} onChange={set("substancias")} placeholder="Ex: Basalto (Brita)" />
              <p className="mt-1 text-xs text-muted">Preenchido automaticamente no Buscar CM.</p>
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
              <VinculoPicker titulo="Vinculação com processo ambiental" opcoes={processosAmbientais} valor={vinculos} onChange={setVinculos} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={form.observacoes} onChange={set("observacoes")} rows={2} />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="orgaoAmbiental">Órgão</Label>
              <Select id="orgaoAmbiental" value={form.orgaoAmbiental} onChange={set("orgaoAmbiental")}>
                <option value="">— selecione —</option>
                {ORGAOS_AMB.map((o) => (<option key={o} value={o}>{o}</option>))}
              </Select>
            </div>
            {form.orgaoAmbiental === "Outro" && (
              <div className="md:col-span-2">
                <Label htmlFor="orgaoAmbientalOutro">Órgão (outro)</Label>
                <Input id="orgaoAmbientalOutro" value={form.orgaoAmbientalOutro} onChange={set("orgaoAmbientalOutro")} />
              </div>
            )}
            <div>
              <Label htmlFor="modalidade">Fase</Label>
              <Select id="modalidade" value={form.modalidade} onChange={set("modalidade")}>
                <option value="">— selecione —</option>
                {MODALIDADES.map((m) => (<option key={m} value={m}>{m}</option>))}
              </Select>
            </div>
            {form.modalidade === "Outro" && (
              <div className="md:col-span-2">
                <Label htmlFor="modalidadeOutra">Fase (outra)</Label>
                <Input id="modalidadeOutra" value={form.modalidadeOutra} onChange={set("modalidadeOutra")} />
              </div>
            )}
            <div>
              <Label htmlFor="atividade">Atividade</Label>
              <Input id="atividade" value={form.atividade} onChange={set("atividade")} />
            </div>
            <div>
              <Label htmlFor="responsavelPessoaId">Responsável técnico</Label>
              <Select id="responsavelPessoaId" value={String(form.responsavelPessoaId)} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value }))}>
                <option value="">— sem responsável —</option>
                {pessoas.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
              </Select>
            </div>
            <div>
              <Label htmlFor="numeroLicenca">Nº Licença</Label>
              <div className="flex gap-2">
                <Input id="numeroLicenca" value={form.numeroLicenca} onChange={set("numeroLicenca")} placeholder="Digitado o nº, consulta IAT/IMA" className="flex-1" />
                <Button type="button" variant="secondary" onClick={consultarLicenca} disabled={buscaLicLoading}>
                  {buscaLicLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted">Busca automática só no SGA (IAT) e IMA. Para E-protocolo use <span className="font-medium">Upload PDF</span> abaixo.</p>
              {buscaLicMsg && <p className="mt-1 text-xs text-muted">{buscaLicMsg}</p>}
            </div>
            <div>
              <Label htmlFor="validade">Data de validade</Label>
              <Input id="validade" type="date" value={form.validade} onChange={set("validade")} />
            </div>
            <div>
              <Label htmlFor="alertaDias">Alerta (dias antes do vencimento)</Label>
              <Input id="alertaDias" type="number" min="0" value={form.alertaDias} onChange={set("alertaDias")} />
            </div>
            <div>
              <Label htmlFor="dataLimiteRenovacao">Data Limite para Renovação</Label>
              <Input id="dataLimiteRenovacao" type="date" value={form.dataLimiteRenovacao} onChange={set("dataLimiteRenovacao")} />
            </div>
            <div>
              <Label htmlFor="alertaRenovacaoDias">Alerta (dias antes)</Label>
              <Input id="alertaRenovacaoDias" type="number" min="0" value={form.alertaRenovacaoDias} onChange={set("alertaRenovacaoDias")} />
            </div>
            <div className="md:col-span-2">
              <VinculoPicker titulo="Vinculação com processo minerário" opcoes={processosMinerarios} valor={vinculos} onChange={setVinculos} />
            </div>
            <div>
              <Label htmlFor="numeroProtocolo">Nº do Protocolo de Renovação</Label>
              <Input id="numeroProtocolo" value={form.numeroProtocolo} onChange={set("numeroProtocolo")} />
            </div>
            <div>
              <Label htmlFor="dataProtocolo">Data do Protocolo de Renovação</Label>
              <Input id="dataProtocolo" type="date" value={form.dataProtocolo} onChange={set("dataProtocolo")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="condicionantes">Condicionantes</Label>
              <label className="mb-1 inline-flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
                {pdfLoading ? "Lendo..." : "Upload PDF (extrair)"}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={importarLicenca} disabled={pdfLoading} />
              </label>
              <Textarea id="condicionantes" value={form.condicionantes} onChange={set("condicionantes")} rows={4} />
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

      <ConfirmPopup
        open={!!dup}
        title="Processo duplicado"
        message={dup?.message ?? ""}
        confirmText="Abrir existente"
        onCancel={() => setDup(null)}
        onConfirm={() => {
          if (dup?.existingId) { router.push(`/processos/${dup.existingId}`); router.refresh(); }
          setDup(null);
        }}
      />
    </form>
  );
}
