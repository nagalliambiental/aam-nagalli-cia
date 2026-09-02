"use client";

import { useRouter } from "next/navigation";

export function EmpreendimentoDropdown({ empreendimentos }: { empreendimentos: { id: number; nome: string }[] }) {
  const router = useRouter();
  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) router.push(`/empreendimentos/${e.target.value}`);
      }}
      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 hover:border-navy-400 hover:bg-slate-50"
      title="Ir para empreendimento"
    >
      <option value="">Empreendimentos ▾</option>
      {empreendimentos.map((e) => (
        <option key={e.id} value={e.id}>{e.nome}</option>
      ))}
    </select>
  );
}
