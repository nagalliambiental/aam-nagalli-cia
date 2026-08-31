import { requireAuth } from "@/lib/perfil";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar
        user={{ nome: user.email ?? "Usuário", perfilNome: user.perfilNome ?? "" }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 md:px-6">
          <NotificationBell />
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
