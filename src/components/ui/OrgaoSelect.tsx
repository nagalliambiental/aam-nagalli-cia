"use client";

import { useState } from "react";
import { Select, Input, Label, Button } from "@/components/ui";

type OrgaoOption = { id: number; sigla: string; nome?: string | null };

export function OrgaoSelect({
  orgaos,
  value,
  onChange,
  label = "Órgão",
  required = true,
}: {
  orgaos: OrgaoOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  required?: boolean;
}) {
  const [modoOutro, setModoOutro] = useState(false);
  const [nomeOutro, setNomeOutro] = useState("");
  const [siglaOutro, setSiglaOutro] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function criarOutro() {
    if (!nomeOutro.trim() || !siglaOutro.trim()) {
      setErro("Informe o nome e a sigla do órgão.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/orgaos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeOutro.trim(),
          sigla: siglaOutro.trim().toUpperCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data?.error ?? "Erro ao criar órgão.");
        return;
      }
      onChange(String(data.id));
      setModoOutro(false);
      setNomeOutro("");
      setSiglaOutro("");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      {!modoOutro ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="orgaoId" required={required}>{label}</Label>
            <Select
              id="orgaoId"
              value={value}
              onChange={(e) => {
                if (e.target.value === "__outro__") {
                  setModoOutro(true);
                  return;
                }
                onChange(e.target.value);
              }}
              required={required}
            >
              {orgaos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.sigla}{o.nome ? ` — ${o.nome}` : ""}
                </option>
              ))}
              <option value="__outro__">Outro… (cadastrar)</option>
            </Select>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Cadastrar novo órgão
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <div>
              <Label htmlFor={`nomeOutro-${label}`} required>Nome</Label>
              <Input
                id={`nomeOutro-${label}`}
                value={nomeOutro}
                onChange={(e) => setNomeOutro(e.target.value)}
                placeholder="Ex.: Secretaria Municipal de Meio Ambiente"
              />
            </div>
            <div>
              <Label htmlFor={`siglaOutro-${label}`} required>Sigla</Label>
              <Input
                id={`siglaOutro-${label}`}
                value={siglaOutro}
                onChange={(e) => setSiglaOutro(e.target.value.toUpperCase())}
                placeholder="Ex.: SEMMA"
                maxLength={20}
              />
            </div>
          </div>
          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="primary" onClick={criarOutro} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar órgão"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setModoOutro(false);
                setNomeOutro("");
                setSiglaOutro("");
                setErro(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
