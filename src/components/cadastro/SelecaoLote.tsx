"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmPopup } from "@/components/ui";
import { Trash2 } from "lucide-react";

type FiltroTudo = Record<string, string | number | undefined>;

type CtxLote = {
  registrar: (id: number) => void;
  remover: (id: number) => void;
  alternar: (id: number) => void;
  selecionados: number[];
  totalRegistros: number;
  permitido: boolean;
  limpar: () => void;
  marcarTudo: () => void;
  totalGeral: number | null;
  marcarTudoGeral: () => void;
  tudoAtivo: boolean;
  excluirTudo: boolean;
  pedirConfirmacao: () => void;
  mensagem: string | null;
};

const LoteNulo: CtxLote = {
  registrar: () => {},
  remover: () => {},
  alternar: () => {},
  selecionados: [],
  totalRegistros: 0,
  permitido: false,
  limpar: () => {},
  marcarTudo: () => {},
  totalGeral: null,
  marcarTudoGeral: () => {},
  tudoAtivo: false,
  excluirTudo: false,
  pedirConfirmacao: () => {},
  mensagem: null,
};

const Ctx = createContext<CtxLote>(LoteNulo);

/**
 * Seleção multiple + exclusão em massa para listas de cadastro.
 * Uso:
 *   <SelecaoLote rota="/api/empresas/excluir-lote" permitido={pode} total={total} filtroTudo={{ q, tipo }}>
 *     <BarraLote />
 *     ... <LinhaSelecionavel id={x.id}>linha …</LinhaSelecionavel> ...
 *   </SelecaoLote>
 *
 * Com `total` + `filtroTudo`, a barra mostra "Selecionar todos os N" para
 * excluir registros além da página atual (o filtro é reaplicado no servidor).
 */
export function SelecaoLote({
  rota,
  permitido,
  total,
  filtroTudo,
  children,
}: {
  rota: string;
  permitido: boolean;
  total?: number;
  filtroTudo?: FiltroTudo;
  children: ReactNode;
}) {
  const router = useRouter();
  const [registros, setRegistros] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [tudo, setTudo] = useState(false);
  const [confirma, setConfirma] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const valor: CtxLote = useMemo(
    () => ({
      registrar: (id) => setRegistros((r) => { const n = new Set(r); n.add(id); return n; }),
      remover: (id) => setRegistros((r) => { const n = new Set(r); n.delete(id); return n; }),
      alternar: (id) => { setTudo(false); setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); },
      selecionados: [...sel],
      totalRegistros: registros.size,
      permitido,
      limpar: () => { setTudo(false); setSel(new Set()); },
      marcarTudo: () => { setTudo(false); setSel(new Set(registros)); },
      totalGeral: total ?? null,
      marcarTudoGeral: () => { setSel(new Set()); setTudo(true); },
      tudoAtivo: tudo,
      excluirTudo: tudo,
      pedirConfirmacao: () => setConfirma(true),
      mensagem: msg,
    }),
    [sel, registros, permitido, msg, total, filtroTudo, tudo],
  );

  async function excluirSelecionados() {
    const ids = [...sel];
    const emTudo = tudo && filtroTudo != null;
    setConfirma(false);
    if (ids.length === 0 && !emTudo) return;
    setMsg(null);
    const res = await fetch(rota, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emTudo ? { tudo: true, filtro: filtroTudo } : { ids }),
    });
    const d = (await res.json().catch(() => ({}))) as { exclidos?: number; bloqueados?: number[]; error?: string };
    setSel(new Set());
    setTudo(false);
    if (!res.ok) {
      setMsg(d.error ?? "Erro na exclusão em lote.");
      return;
    }
    const bloqueados = d.bloqueados ?? [];
    const restam = bloqueados.length;
    const afetados = d.exclidos ?? (emTudo ? 0 : ids.length);
    setMsg(restam > 0
      ? `${afetados} excluído(s); ${restam} não puderam ser excluídos (vinculados a outros registros).`
      : `${afetados} registro(s) excluído(s).`);
    router.refresh();
  }

  return (
    <Ctx.Provider value={valor}>
      {children}
      <ConfirmPopup
        open={confirma}
        title="Excluir em lote"
        message={
          tudo && total != null
            ? `Excluir definitivamente TODOS os ${total} registro(s) do filtro atual? Os dados vinculados também serão removidos e a ação não pode ser desfeita.`
            : `Excluir definitivamente ${sel.size} registro(s)? Os dados vinculados também serão removidos.`
        }
        confirmText={tudo ? "Excluir todos" : "Excluir"}
        cancelText="Cancelar"
        onConfirm={excluirSelecionados}
        onCancel={() => setConfirma(false)}
      />
    </Ctx.Provider>
  );
}

/** Barra de ações da seleção (marcar tudo / limpar / excluir selecionados). */
export function BarraLote() {
  const lote = useContext(Ctx);
  if (!lote.permitido) return null;
  const podeGeral = lote.totalGeral != null && lote.totalGeral > lote.totalRegistros;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 text-sm">
      <Button type="button" variant="secondary" onClick={lote.marcarTudo} className="px-3 py-1.5 text-xs">
        Selecionar página ({lote.totalRegistros})
      </Button>
      {podeGeral && (
        <Button type="button" variant="secondary" onClick={lote.marcarTudoGeral} className="px-3 py-1.5 text-xs">
          Selecionar todos os {lote.totalGeral}
        </Button>
      )}
      {(lote.selecionados.length > 0 || lote.excluirTudo) && (
        <>
          <Button type="button" variant="ghost" onClick={lote.limpar} className="px-3 py-1.5 text-xs">
            Limpar seleção
          </Button>
          <span className="text-xs text-muted">
            {lote.excluirTudo && lote.totalGeral != null
              ? `Todos os ${lote.totalGeral} registro(s)`
              : `${lote.selecionados.length} selecionado(s)`}
          </span>
          <Button type="button" variant="danger" onClick={lote.pedirConfirmacao} className="px-3 py-1.5 text-xs">
            <Trash2 className="h-3.5 w-3.5" /> Excluir selecionados
          </Button>
        </>
      )}
      {lote.mensagem && <p className="w-full text-xs text-navy-700">{lote.mensagem}</p>}
    </div>
  );
}

export function LinhaSelecionavel({ id, children }: { id: number; children: ReactNode }) {
  const lote = useContext(Ctx);
  const permitido = lote.permitido;
  const selecionado = !lote.excluirTudo && lote.selecionados.includes(id);

  useEffect(() => {
    if (!permitido) return;
    lote.registrar(id);
    return () => lote.remover(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, permitido]);

  if (!permitido) {
    return <li>{children}</li>;
  }

  return (
    <li className="flex items-stretch">
      <label className="flex cursor-pointer items-center pl-4 pr-1" title="Selecionar">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={() => lote.alternar(id)}
          className="h-4 w-4 accent-navy-700"
        />
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

/** Variante para listas em <table>: envia o checkbox como primeira célula. */
export function LinhaSelecionavelTabela({ id, children }: { id: number; children: ReactNode }) {
  const lote = useContext(Ctx);
  const permitido = lote.permitido;
  const selecionado = !lote.excluirTudo && lote.selecionados.includes(id);

  useEffect(() => {
    if (!permitido) return;
    lote.registrar(id);
    return () => lote.remover(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, permitido]);

  if (!permitido) {
    return <tr>{children}</tr>;
  }

  return (
    <tr>
      <td className="pl-4">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={() => lote.alternar(id)}
          className="h-4 w-4 accent-navy-700"
          aria-label={`Selecionar registro ${id}`}
        />
      </td>
      {children}
    </tr>
  );
}
