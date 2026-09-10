"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import { StatusBadge } from "@/components/processos/StatusBadge";

const MINERARIO = [
  { value: "ativo", label: "Ativo" },
  { value: "paralisado", label: "Paralisado" },
  { value: "morto", label: "Morto" },
];

const AMBIENTAL = [
  { value: "ativo", label: "Ativo" },
  { value: "proximo_vencimento", label: "Próximo do Vencimento" },
  { value: "em_renovacao", label: "Em Renovação" },
  { value: "encerrado", label: "Encerrado" },
  { value: "morto", label: "Morto" },
];

export function ProcessoStatusRapido({
  id,
  natureza,
  status,
  statusExibido,
  podeEditar,
}: {
  id: number;
  natureza: string;
  status: string;
  statusExibido: string;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const options = natureza === "ambiental" ? AMBIENTAL : MINERARIO;
  const optionsWithCurrent = options.some((option) => option.value === value) ? options : [...options, { value, label: value }];

  async function changeStatus(next: string) {
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      const response = await fetch(`/api/processos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error("Não foi possível atualizar o status.");
      router.refresh();
    } catch {
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={statusExibido} />
      {podeEditar && (
        <Select
          value={value}
          onChange={(event) => changeStatus(event.target.value)}
          disabled={saving}
          aria-label="Alterar status do processo"
          className="w-auto min-w-36 py-1 text-xs"
        >
          {optionsWithCurrent.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      )}
    </div>
  );
}
