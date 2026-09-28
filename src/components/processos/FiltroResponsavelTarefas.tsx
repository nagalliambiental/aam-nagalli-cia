"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function FiltroResponsavelTarefas({
  pessoas,
  valor,
}: {
  pessoas: { id: number; nome: string }[];
  valor: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return (
    <select
      aria-label="Filtrar tarefas por responsável"
      value={valor ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams(sp.toString());
        if (e.target.value) params.set("responsavel", e.target.value);
        else params.delete("responsavel");
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-navy-700 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
    >
      <option value="">Responsável: todos</option>
      {pessoas.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nome}
        </option>
      ))}
    </select>
  );
}
