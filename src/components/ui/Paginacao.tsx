import Link from "next/link";

/** Janela de páginas ao redor da atual (±2 com primeira e última). */
function janela(atual: number, total: number): number[] {
  const set = new Set<number>([1, total]);
  for (let p = atual - 2; p <= atual + 2; p++) {
    if (p >= 1 && p <= total) set.add(p);
  }
  return [...set].sort((a, b) => a - b);
}

export function Paginacao({
  pagina,
  total,
  porPagina = 20,
  construirHref,
}: {
  pagina: number;
  total: number;
  porPagina?: number;
  construirHref: (p: number) => string;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (totalPaginas <= 1) return null;

  const parts = janela(pagina, totalPaginas);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm">
      <p className="text-xs text-muted">
        Página {pagina} de {totalPaginas} {total > 0 ? `· ${total} registro(s)` : ""}
      </p>
      <div className="flex items-center gap-1">
        {pagina > 1 && (
          <Link href={construirHref(Math.max(1, pagina - 1))} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
            ‹ Anterior
          </Link>
        )}
        {parts.map((p, idx) => {
          const anterior = parts[idx - 1];
          const gap = anterior != null && p - anterior > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {gap && <span className="text-muted">…</span>}
              <Link
                href={construirHref(p)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${p === pagina ? "bg-navy-100 text-navy-900 ring-1 ring-navy-300" : "text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
              >
                {p}
              </Link>
            </span>
          );
        })}
        {pagina < totalPaginas && (
          <Link href={construirHref(Math.min(totalPaginas, pagina + 1))} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-slate-200 hover:bg-slate-50">
            Próxima ›
          </Link>
        )}
      </div>
    </div>
  );
}
