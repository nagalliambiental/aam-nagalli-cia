import { requireAuth } from "@/lib/perfil";
import { Sidebar } from "@/components/layout/Sidebar";

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
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 pt-16 sm:px-6 md:py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
