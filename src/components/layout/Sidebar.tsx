"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Building2, Landmark, FolderOpen, CalendarClock,
  LogOut, ClipboardList, Menu, X, Users, Mountain, Map, FileBadge, FileCheck,
  BellRing, CalendarDays, BarChart3, FileBarChart, FileText, Workflow, Wallet,
  ShieldCheck, ChevronDown, CheckSquare, HandCoins, FileSignature,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const DASHBOARD: NavItem = { href: "/", label: "Painel", icon: LayoutDashboard };

const SECTIONS: NavGroup[] = [
  {
    label: "Acompanhamento",
    items: [
      { href: "/alertas", label: "Alertas", icon: BellRing },
      { href: "/calendario", label: "Calendário", icon: CalendarDays },
      { href: "/prazos", label: "Prazos", icon: CalendarClock },
      { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/empresas", label: "Empresas", icon: Building2 },
      { href: "/empreendimentos", label: "Empreendimentos", icon: Mountain },
      { href: "/orgaos", label: "Órgãos", icon: Landmark },
      { href: "/areas", label: "Áreas", icon: Map },
      { href: "/pessoas", label: "Pessoas", icon: Users },
    ],
  },
  {
    label: "Processos",
    items: [
      { href: "/processos", label: "Processos", icon: FolderOpen },
      { href: "/documentos", label: "Documentos", icon: FileText },
    ],
  },
  {
    label: "Atos",
    items: [
      { href: "/titulos", label: "Títulos", icon: FileBadge },
      { href: "/licencas", label: "Licenças", icon: FileCheck },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/contratos", label: "Contratos", icon: FileSignature },
    ],
  },
  {
    label: "Análises",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
      { href: "/indicadores", label: "Indicadores", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/regras-prazo", label: "Regras de prazo", icon: Workflow },
      { href: "/auditoria", label: "Auditoria", icon: ShieldCheck },
      { href: "/config", label: "Configurações", icon: ClipboardList },
    ],
  },
];

const FLAT_LINKS = [DASHBOARD, ...SECTIONS.flatMap((s) => s.items)];

export function Sidebar({ user }: { user: { nome: string; perfilNome: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function isItemActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }
  function isGroupActive(items: NavItem[]) {
    return items.some((i) => isItemActive(i.href));
  }

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const itemActive = isItemActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-md py-1.5 pl-3 pr-2 text-sm transition ${
          itemActive
            ? "bg-white/15 font-medium"
            : "text-white/75 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">{item.label}</span>
      </Link>
    );
  };

  const nav = (
    <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
      {renderLink(DASHBOARD)}
      {SECTIONS.map((group) => {
        const active = isGroupActive(group.items);
        const isOpen = collapsed[group.label] ?? active;
        return (
          <div key={group.label}>
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [group.label]: !isOpen }))}
              className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                active ? "text-gold-300" : "text-white/50 hover:text-white/80"
              }`}
            >
              <span>{group.label}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {isOpen && (
              <div className="mt-0.5 space-y-0.5 pb-1">
                {group.items.map(renderLink)}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

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

      {nav}

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
      <button
        onClick={() => setOpen(true)}
        title="Abrir menu"
        className="fixed left-4 top-4 z-50 rounded-md bg-navy-900 p-2 text-white shadow-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col bg-navy-900 text-white lg:flex xl:w-64">
        {content}
      </aside>

      {/* Tablet compacto */}
      <aside className="hidden h-screen w-16 shrink-0 flex-col items-center bg-navy-900 text-white md:flex lg:hidden">
        <div className="flex h-14 w-full items-center justify-center border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold-500 font-bold text-navy-900">
            AAM
          </div>
        </div>
        <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-4">
          {FLAT_LINKS.map((item) => {
            const Icon = item.icon;
            const itemActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center rounded-md p-2.5 transition ${
                  itemActive ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
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

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
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
