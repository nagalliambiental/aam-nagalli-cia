"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";

function formatDateToLocal(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

interface Notificacao {
  id: number;
  tipo: string;
  mensagem: string;
  canal: string;
  lida: boolean;
  dataEnvio: string;
  processoId: number | null;
  prazoId: number | null;
  tarefaId: number | null;
  licencaId: number | null;
}

function notificacaoLink(n: Notificacao): string | null {
  if (n.processoId) return `/processos/${n.processoId}`;
  if (n.licencaId) return `/licencas/${n.licencaId}`;
  if (n.prazoId) return `/prazos`;
  if (n.tarefaId) return `/tarefas`;
  return null;
}

export function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotificacoes = useCallback(async () => {
    const res = await fetch("/api/notificacoes");
    if (res.ok) {
      setNotificacoes(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotificacoes]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function marcarLidas() {
    const res = await fetch("/api/notificacoes/marcar-lidas", { method: "POST" });
    if (res.ok) setNotificacoes([]);
  }

  const count = notificacoes.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold text-navy-900">Notificações</span>
            {count > 0 && (
              <button
                onClick={marcarLidas}
                className="text-xs font-medium text-navy-700 hover:text-navy-900"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">
                Nenhuma notificação não lida.
              </div>
            ) : (
              notificacoes.map((n) => {
                const href = notificacaoLink(n);
                const content = (
                  <div className="border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
                    <p className="text-sm text-slate-700">{n.mensagem}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDateToLocal(n.dataEnvio)}
                    </p>
                  </div>
                );

                return href ? (
                  <a key={n.id} href={href} onClick={() => setOpen(false)}>
                    {content}
                  </a>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
