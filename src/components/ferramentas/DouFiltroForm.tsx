"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function DouFiltroForm({
  periodoInicial,
  inicioInicial,
  fimInicial,
}: {
  periodoInicial: string;
  inicioInicial: string;
  fimInicial: string;
}) {
  const [periodo, setPeriodo] = useState(periodoInicial);

  return (
    <form method="get" className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div>
        <label htmlFor="dou-periodo" className="mb-1 block text-xs font-medium text-slate-700">Período</label>
        <select id="dou-periodo" name="periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="30">Últimos 30 dias</option>
          <option value="60">Últimos 60 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="personalizado">Personalizado</option>
        </select>
      </div>
      {periodo === "personalizado" && (
        <>
          <div>
            <label htmlFor="dou-inicio" className="mb-1 block text-xs font-medium text-slate-700">Data inicial</label>
            <input id="dou-inicio" name="inicio" type="date" defaultValue={inicioInicial} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="dou-fim" className="mb-1 block text-xs font-medium text-slate-700">Data final</label>
            <input id="dou-fim" name="fim" type="date" defaultValue={fimInicial} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </div>
        </>
      )}
      <Button type="submit" variant="secondary">Filtrar</Button>
    </form>
  );
}
