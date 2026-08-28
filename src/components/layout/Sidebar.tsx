"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Building2, Landmark, FolderOpen, CalendarClock,
  Users, LogOut, ClipboardList,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/processos", label: "Processos", icon: FolderOpen },
  { href: "/prazos", label: "Prazos", icon: CalendarClock },
  { href: "/orgaos", label: "Órgãos", icon: Landmark },
  { href: "/config", label: "Configurações", icon: ClipboardList },
];

export function Sidebar({ user }: { user: { nome: string; perfilNome: string } }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold-500 font-bold text-navy-900">
          AAM
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Ambiental &amp; Mineral</p>
          <p className="text-xs text-white/60">Nagalli &amp; Cia LTDA</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-white/15 font-medium"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="leading-tight">
            <p className="text-sm font-medium truncate max-w-[9rem]">{user.nome}</p>
            <p className="text-xs text-white/60">{user.perfilNome}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
