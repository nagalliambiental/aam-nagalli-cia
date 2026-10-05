"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { ArquivosSelecao } from "@/components/processos/ArquivosSelecao";
import { enviarAnexosTarefa } from "@/lib/anexos-cliente";

type EmpreendimentoComProcessos = { id: number; nome: string; apelido?: string | null; processos: { id: number; numero: string }[]; processosAmbientais?: ProcessoAmbientalOpt[] };
type ProcessoAmbientalOpt = { id: number; numero: string; apelido: string | null; numeroLicenca: string | null };

function rotuloAmbiental(p: ProcessoAmbientalOpt) {
  return `${p.apelido || `Processo ${p.numero}`} · Licença ${p.numeroLicenca || "—"}`;
}

export function TarefaNovaForm({
  pessoas,
  empreendimentos,
  processosAmbientais = [],
  showVisibilidade = false,
  onClose,
}: {
  pessoas: { id: number; nome: string }[];
  empreendimentos: EmpreendimentoComProcessos[];
  processosAmbientais?: ProcessoAmbientalOpt[];
  showVisibilidade?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    prazoData: "",
    alertaDias: "30",
    dataLimite: "",
    alertaDataLimite: "",
    status: "nao_iniciado",
    responsavelPessoaId: pessoas[0]?.id ?? "",
    empreendimentoId: "",
    processoId: "",
    visibilidade: "publico",
    recorrente: false,
    intervaloDias: "30",
    fimRecorrencia: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);

  const empreendimento = empreendimentos.find((e) => e.id === Number(form.empreendimentoId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const intervalo = Number(form.intervaloDias);
    if (form.recorrente && (!Number.isFinite(intervalo) || intervalo < 1 || intervalo > 3650)) {
      setLoading(false);
      setError("Intervalo de recorrência deve ser de 1 a 3650 dias.");
      return;
    }
    const res = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        responsavelPessoaId: form.responsavelPessoaId ? Number(form.responsavelPessoaId) : null,
        empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
        processoId: form.processoId ? Number(form.processoId) : null,
        prazoData: form.prazoData ? new Date(form.prazoData) : null,
        alertaDias: form.alertaDias !== "" ? Number(form.alertaDias) : 30,
        recorrente: form.recorrente
          ? { intervaloDias: Math.floor(intervalo), fimRecorrencia: form.fimRecorrencia || null }
          : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(d.error ?? "Erro ao criar tarefa.");
      return;
    }

    if (arquivos.length > 0 && d.id) {
      const { enviados, falhas } = await enviarAnexosTarefa(Number(d.id), arquivos);
      if (falhas.length > 0) {
        alert(
          `Tarefa criada${enviados > 0 ? ` com ${enviados} arquivo(s) enviado(s)` : ""}, mas falhou em:\n${falhas.join("\n")}`,
        );
      }
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-200 bg-white p-5">
      <div>
        <Label htmlFor="titulo" required>Título</Label>
        <Input id="titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} required />
      </div>
      <div>
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="responsavelPessoaId" required>Responsável pela Execução</Label>
          <Select id="responsavelPessoaId" value={String(form.responsavelPessoaId)} onChange={(e) => setForm((f) => ({ ...f, responsavelPessoaId: e.target.value as unknown as number }))} required>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="empreendimentoId">Empreendimento</Label>
          <Select id="empreendimentoId" value={form.empreendimentoId} onChange={(e) => setForm((f) => ({ ...f, empreendimentoId: e.target.value, processoId: "" }))}>
            <option value="">— sem empreendimento —</option>
            {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.apelido || e.nome}</option>)}
          </Select>
        </div>
        {empreendimento && (
          <div>
            <Label htmlFor="processoId">Processo (opcional)</Label>
            <Select id="processoId" value={form.processoId} onChange={(e) => setForm((f) => ({ ...f, processoId: e.target.value }))}>
              <option value="">— sem processo —</option>
              {empreendimento.processos.length > 0 && (
                <optgroup label="Minerários">
                  {empreendimento.processos.map((p) => <option key={p.id} value={p.id}>{p.numero}</option>)}
                </optgroup>
              )}
              {(empreendimento.processosAmbientais ?? []).length > 0 && (
                <optgroup label="Ambientais">
                  {(empreendimento.processosAmbientais ?? []).map((p) => <option key={p.id} value={p.id}>{rotuloAmbiental(p)}</option>)}
                </optgroup>
              )}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="prazoData">Prazo Final</Label>
          <Input id="prazoData" type="date" value={form.prazoData} onChange={(e) => setForm((f) => ({ ...f, prazoData: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="alertaDias">Alerta (dias antes)</Label>
          <Input id="alertaDias" type="number" min="1" value={form.alertaDias} onChange={(e) => setForm((f) => ({ ...f, alertaDias: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="dataLimite">Limite de Execução Serviço</Label>
          <Input id="dataLimite" type="date" value={form.dataLimite} onChange={(e) => setForm((f) => ({ ...f, dataLimite: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="alertaDataLimite">Alerta (dias antes)</Label>
          <Input id="alertaDataLimite" type="number" min="1" value={form.alertaDataLimite} onChange={(e) => setForm((f) => ({ ...f, alertaDataLimite: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="prioridade">Prioridade</Label>
          <Select id="prioridade" value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="nao_iniciado">Não Iniciado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluído</option>
            <option value="para_revisao">Para Revisão</option>
          </Select>
        </div>
        {showVisibilidade && (
          <div>
            <Label htmlFor="visibilidade">Visibilidade</Label>
            <Select id="visibilidade" value={form.visibilidade} onChange={(e) => setForm((f) => ({ ...f, visibilidade: e.target.value }))}>
              <option value="publico">Público</option>
              <option value="privado">Privado</option>
            </Select>
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-900">
          <input
            type="checkbox"
            checked={form.recorrente}
            onChange={(e) => setForm((f) => ({ ...f, recorrente: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500"
          />
          Tarefa recorrente
        </label>
        {form.recorrente && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="intervaloDias" required>Repetir a cada (dias)</Label>
              <Input
                id="intervaloDias"
                type="number"
                min={1}
                max={3650}
                value={form.intervaloDias}
                onChange={(e) => setForm((f) => ({ ...f, intervaloDias: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="fimRecorrencia">Terminar em (opcional)</Label>
              <Input
                id="fimRecorrencia"
                type="date"
                value={form.fimRecorrencia}
                onChange={(e) => setForm((f) => ({ ...f, fimRecorrencia: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted md:col-span-2">
              A próxima ocorrência é criada automaticamente quando esta tarefa for concluída, com o mesmo responsável e vínculos.
            </p>
          </div>
        )}
      </div>
      <ArquivosSelecao arquivos={arquivos} onChange={setArquivos} disabled={loading} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Criar tarefa"}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  );
}
