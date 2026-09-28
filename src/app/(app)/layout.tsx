import { requireAuth } from "@/lib/perfil";
import { Sidebar } from "@/components/layout/Sidebar";
import { BuscaAutoGlobal } from "@/components/BuscaAutoGlobal";
import { BackupAutomatico } from "@/components/layout/BackupAutomatico";
import { BuscaGlobal } from "@/components/layout/BuscaGlobal";
import { NotificationBell } from "@/components/layout/NotificationBell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <BuscaAutoGlobal />
      <BackupAutomatico administrador={user.perfilNome === "Administrador"} />
      <Sidebar
        user={{ nome: user.email ?? "Usuário", perfilNome: user.perfilNome ?? "" }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="min-w-0 flex-1 md:max-w-md">
            <BuscaGlobal />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
