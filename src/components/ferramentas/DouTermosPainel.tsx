"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label } from "@/components/ui";
import { Check, X } from "lucide-react";
import type { DouTermo } from "@/lib/dou-termos";

/**
 * Cura dos termos usados na busca do DOU:
 * - automáticos (cadastros): podem ser desativados/reativados (persistido em DouConfiguracao.termosDesativados);
 * - manuais: um por linha na caixa de texto — editáveis e removíveis livremente.
 */
export function DouTermosPainel({
  automaticos,
  manuaisIniciais,
  desativadosIniciais,
}: {
  automaticos: DouTermo[];
  manuaisIniciais: string[];
  desativadosIniciais: string[];
}) {
  const router = useRouter();
  const [chips, setChips] = useState<DouTermo[]>(automaticos);
  const [manuais, setManuais] = useState(manuaisIniciais.join("\n"));
  const [desativados, setDesativados] = useState<string[]>(desativadosIniciais);
  const [hora, setHora] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/ferramentas/dou/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.hora) setHora(d.hora); })
      .catch(() => {});
  }, []);

  function desativar(i: number) {
    const t = chips[i];
    setChips((arr) => arr.filter((_, x) => x !== i));
    setDesativados((arr) => [...arr, t.text]);
  }

  function reativar(i: number) {
    const t = desativados[i];
    setDesativados((arr) => arr.filter((_, x) => x !== i));
    setChips((arr) => [...arr, { text: t, origem: "Reativado", id: undefined }]);
  }

  async function salvar() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/ferramentas/dou/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hora: hora || "00:00", termosExtras: manuais, termosDesativados: desativados.join("\n") }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg("Termos atualizados. O worker do DOU busca por estes termos amanhã.");
      router.refresh();
    } else {
      setMsg(d.error ?? "Não foi possível salvar.");
    }
  }

  const temMudanca =
    desativados.join("\n").trim() !== desativadosIniciais.join("\n").trim() ||
    manuais.trim() !== manuaisIniciais.join("\n").trim();

  return (
    <div className="space-y-6 p-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">
            Termos automáticos <span className="text-xs font-normal text-muted">(dos cadastros)</span>
          </h3>
          <span className="text-xs text-muted">{chips.length} ativo(s)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((t, i) => (
            <span key={`${t.origem}-${t.text}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-navy-800">
              <span className="truncate" title={`${t.text} · ${t.origem}`}>{t.text}</span>
              <span className="shrink-0 text-[10px] uppercase text-muted">
                {t.origem === "Reativado" ? "" : t.origem}
              </span>
              <button
                type="button"
                onClick={() => desativar(i)}
                title="Desativar este termo nas buscas"
                className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {chips.length === 0 && <p className="text-xs text-muted">Nenhum termo automático ativo.</p>}
        </div>
      </section>

      {desativados.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">
            Desativados <span className="text-xs font-normal text-muted">({desativados.length} — não são pesquisados no DOU)</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {desativados.map((t, i) => (
              <span key={`${t}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-navy-600">
                <span className="truncate">{t}</span>
                <button
                  type="button"
                  onClick={() => reativar(i)}
                  title="Reativar"
                  className="shrink-0 rounded-full p-0.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Check className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <Label htmlFor="dou-termos-manuais">Termos manuais (um por linha — edite e remova à vontade)</Label>
        <textarea
          id="dou-termos-manuais"
          value={manuais}
          onChange={(e) => setManuais(e.target.value)}
          rows={5}
          placeholder="Um termo por linha"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </section>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={salvar} disabled={loading || !temMudanca}>
          {loading ? "Salvando..." : "Salvar termos"}
        </Button>
        {!temMudanca && <span className="text-xs text-muted">Nenhuma alteração pendente.</span>}
      </div>
      {msg && <p className="text-sm text-navy-700">{msg}</p>}
    </div>
  );
}
