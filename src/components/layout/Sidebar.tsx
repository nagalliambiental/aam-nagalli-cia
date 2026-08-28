"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Building2, Landmark, FolderOpen, CalendarClock,
  LogOut, ClipboardList, Menu, X,
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
  const [open, setOpen] = useState(false);

  const content = (
    <>
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gold-500 font-bold text-navy-900">
          AAM
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold whitespace-nowrap">Ambiental &amp; Mineral</p>
          <p className="text-xs text-white/60 whitespace-nowrap">Nagalli &amp; Cia LTDA</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-white/15 font-medium"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{user.nome}</p>
            <p className="truncate text-xs text-white/60">{user.perfilNome}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="shrink-0 rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Botão hambúrguer (somente mobile) */}
      <button
        onClick={() => setOpen(true)}
        title="Abrir menu"
        className="fixed left-4 top-4 z-50 rounded-md bg-navy-900 p-2 text-white shadow-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop: sidebar fixa ocupando 100vh */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col bg-navy-900 text-white lg:flex xl:w-64">
        {content}
      </aside>

      {/* Tablet: sidebar compacta (ícones) */}
      <aside className="hidden h-screen w-16 shrink-0 flex-col items-center bg-navy-900 text-white md:flex lg:hidden">
        <div className="flex h-14 w-full items-center justify-center border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold-500 font-bold text-navy-900">
            AAM
          </div>
        </div>
        <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center rounded-md p-2.5 transition ${
                  active ? "bg-white/15" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
              </Link>
            );
          })}
        </nav>
        <div className="w-full border-t border-white/10 p-2">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="mx-auto flex items-center justify-center rounded-md p-2.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Mobile: sidebar em overlay deslizante */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-navy-900 text-white shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              title="Fechar menu"
              className="absolute right-3 top-3 rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
