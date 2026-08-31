import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: "#021e4c" }}
    >
      {/* Brilhos decorativos (vibe do sidebar) */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-navy-500/30 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo no topo, sem borda branca */}
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="AAM Ambiental & Mineral"
            className="w-40"
          />
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-1 text-center text-lg font-semibold text-navy-900">
            Bem-vindo
          </h2>
          <p className="mb-6 text-center text-sm text-muted">
            Acesse o sistema com suas credenciais
          </p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} AAM Ambiental & Mineral
        </p>
      </div>
    </div>
  );
}
