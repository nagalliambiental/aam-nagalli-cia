"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { Layers, X } from "lucide-react";

export type ProcessoMassaOpt = {
  id: number;
  numero: string;
  apelido: string | null;
  natureza: string;
  numeroLicenca: string | null;
  empreendimento: string;
};

function rotulo(p: ProcessoMassaOpt) {
  return p.natureza === "ambiental"
    ? `${p.apelido || `Processo ${p.numero}`} · ${p.empreendimento}`
    : `Nº ${p.numero} · ${p.empreendimento}`;
}

export function TarefaEmMassa({
  pessoas,
  processos,
  showVisibilidade = false,
}: {
  pessoas: { id: number; nome: string }[];
  processos: ProcessoMassaOpt[];
  showVisibilidade?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState(pessoas[0] ? String(pessoas[0].id) : "");
  const [prazo, setPrazo] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [visibilidade, setVisibilidade] = useState("publico");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const b = busca.toLowerCase().trim();
  const filtrados = useMemo(
    () => (b ? processos.filter((p) => rotulo(p).toLowerCase().includes(b) || (p.numeroLicenca ?? "").toLowerCase().includes(b)) : processos),
    [processos, b]
  );
  const minerarios = filtrados.filter((p) => p.natureza !== "ambiental");
  const ambientais = filtrados.filter((p) => p.natureza === "ambiental");
  const mapa = useMemo(() => new Map(processos.map((p) => [p.id, p])), [processos]);

  function alternar(id: number) {
    setSelecionados((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  }

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/tarefas/massa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        descricao,
        responsavelPessoaId: responsavel ? Number(responsavel) : null,
        processoIds: selecionados,
        prazoData: prazo || null,
        prioridade,
        visibilidade,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg(d.error ?? "Erro ao gerar tarefas.");
      return;
    }
    setMsg(`${d.criadas} tarefa(s) criada(s) com sucesso.`);
    setSelecionados([]);
    setTitulo("");
    setDescricao("");
    setPrazo("");
    router.refresh();
  }

  return (
    <div className="mb-4">
      {!open && (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Layers className="h-4 w-4" /> Tarefa em massa
        </Button>
      )}
      {open && (
        <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h3 className="text-sm font-semibold text-navy-900">Tarefa em massa — uma tarefa por processo</h3>
            <button onClick={() => setOpen(false)} title="Fechar" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={gerar} className="space-y-4 p-5">
            <div>
              <Label htmlFor="tm-busca">Processos</Label>
              <Input id="tm-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, apelido, licença ou empreendimento..." />
              <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200">
                {minerarios.length > 0 && (
                  <div>
                    <p className="sticky top-0 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Minerários</p>
                    {minerarios.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50">
                        <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => alternar(p.id)} className="h-4 w-4 accent-navy-700" />
                        <span>{rotulo(p)}</span>
                      </label>
                    ))}
                  </div>
                )}
                {ambientais.length > 0 && (
                  <div>
                    <p className="sticky top-0 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Ambientais</p>
                    {ambientais.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50">
                        <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => alternar(p.id)} className="h-4 w-4 accent-navy-700" />
                        <span>{rotulo(p)}{p.numeroLicenca ? <span className="text-xs text-muted"> · Licença {p.numeroLicenca}</span> : null}</span>
                      </label>
                    ))}
                  </div>
                )}
                {filtrados.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nenhum processo encontrado.</p>}
              </div>
            </div>

            {selecionados.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-md bg-slate-50 p-3">
                {selecionados.map((id) => {
                  const p = mapa.get(id);
                  if (!p) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-1 text-xs font-medium text-navy-800">
                      {rotulo(p)}
                      <button type="button" onClick={() => alternar(id)} title="Remover" className="rounded-full p-0.5 hover:bg-navy-200">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="tm-titulo" required>Título da tarefa (ex.: RAL Anual)</Label>
                <Input id="tm-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="tm-desc">Descrição</Label>
                <Textarea id="tm-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="tm-resp" required>Responsável pela Execução</Label>
                <Select id="tm-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} required>
                  {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="tm-prazo">Prazo</Label>
                <Input id="tm-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tm-prio">Prioridade</Label>
                <Select id="tm-prio" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </Select>
              </div>
              {showVisibilidade && (
                <div>
                  <Label htmlFor="tm-vis">Visibilidade</Label>
                  <Select id="tm-vis" value={visibilidade} onChange={(e) => setVisibilidade(e.target.value)}>
                    <option value="publico">Público</option>
                    <option value="privado">Privado</option>
                  </Select>
                </div>
              )}
            </div>

            {msg && <p className="text-sm text-navy-900">{msg}</p>}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading || !titulo || !responsavel || selecionados.length === 0}>
                {loading ? "Gerando..." : `Gerar ${selecionados.length} tarefa(s)`}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
