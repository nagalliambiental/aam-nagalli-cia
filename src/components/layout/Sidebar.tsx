"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Building2, FolderOpen, CalendarClock,
  LogOut, Menu, X, Mountain,
  BellRing, CalendarDays, FileBarChart,
  ChevronDown, CheckSquare, FileSignature, Radar, Library,
  ChartPie, Settings2, Download,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };

const DASHBOARD: NavItem = { href: "/", label: "Painel", icon: LayoutDashboard };
const FATURAS: NavItem = { href: "/faturas", label: "Faturas", icon: FileSignature };
const CONTRATOS: NavItem = { href: "/contratos", label: "Contratos", icon: FileSignature };

const SECTIONS: NavGroup[] = [
  {
    label: "Cadastros",
    icon: Library,
    items: [
      { href: "/empresas", label: "Clientes", icon: Building2 },
      { href: "/empreendimentos", label: "Empreendimentos", icon: Mountain },
    ],
  },
  {
    label: "Operacional",
    icon: FolderOpen,
    items: [
      { href: "/processos", label: "Processos", icon: FolderOpen },
      { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { href: "/operacoes", label: "Prazos & Calendário", icon: CalendarClock },
    ],
  },
  {
    label: "Análises",
    icon: ChartPie,
    items: [
      { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
    ],
  },
  {
    label: "Administrativo",
    icon: Settings2,
    items: [
      { href: "/config", label: "Configurações", icon: Settings2 },
      { href: "/backup", label: "Backup", icon: Download },
    ],
  },
];

export function Sidebar({ user }: { user: { nome: string; perfilNome: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isAdmin = user.perfilNome === "Administrador";
  const topLinks = isAdmin ? [DASHBOARD, FATURAS, CONTRATOS] : [DASHBOARD, CONTRATOS];
  const sections = isAdmin ? SECTIONS : SECTIONS.filter((s) => s.label !== "Administrativo");
  const flatLinks = [...topLinks, ...sections.flatMap((s) => s.items)];

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
      {topLinks.map(renderLink)}
      {sections.map((group) => {
        const active = isGroupActive(group.items);
        const isOpen = collapsed[group.label] ?? active;
        const GroupIcon = group.icon;
        return (
          <div key={group.label}>
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [group.label]: !isOpen }))}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                active ? "text-gold-300" : "text-white/50 hover:text-white/80"
              }`}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {isOpen && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/15 pl-3 pb-1">
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
      <div className="flex flex-col items-center border-b border-white/10 px-4 pb-5 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.jpg"
          alt="AAM Ambiental & Mineral"
          className="h-24 w-full max-w-[13rem] object-contain"
        />
      </div>

      {nav}

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user.nome}</p>
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
        className="fixed left-4 top-4 z-50 rounded-md p-2 text-white shadow-lg md:hidden"
        style={{ backgroundColor: "#021e4c" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop */}
      <aside
        className="hidden h-screen w-60 shrink-0 flex-col text-white lg:flex xl:w-64"
        style={{ backgroundColor: "#021e4c" }}
      >
        {content}
      </aside>

      {/* Tablet compacto */}
      <aside
        className="hidden h-screen w-16 shrink-0 flex-col items-center text-white md:flex lg:hidden"
        style={{ backgroundColor: "#021e4c" }}
      >
        <div className="flex h-14 w-full items-center justify-center border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="AAM" className="h-8 w-8 rounded object-contain bg-white" />
        </div>
        <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-4">
          {flatLinks.map((item) => {
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
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col text-white shadow-2xl"
            style={{ backgroundColor: "#021e4c" }}
          >
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
