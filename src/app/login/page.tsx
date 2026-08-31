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
      className="relative flex min-h-screen overflow-hidden"
      style={{ backgroundColor: "#021e4c" }}
    >
      {/* Brilhos decorativos (vibe do sidebar) */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-navy-500/30 blur-3xl" />

      {/* Painel esquerdo: logo em destaque */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center text-center lg:flex">
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="AAM Ambiental & Mineral"
            className="w-72 rounded-2xl bg-white p-5 shadow-2xl"
          />
        </div>
      </div>

      {/* Painel direito: login */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 lg:w-1/2">
        {/* Logo (somente mobile/tablet) */}
        <div className="mb-8 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="AAM Ambiental & Mineral"
            className="h-20 w-20 rounded-xl bg-white p-1 shadow-xl"
          />
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-1 text-center text-lg font-semibold text-navy-900">
            Bem-vindo
          </h2>
          <p className="mb-6 text-center text-sm text-muted">
            Acesse o sistema com suas credenciais
          </p>
          <LoginForm />
        </div>
        <p className="mt-6 text-xs text-white/50">© {new Date().getFullYear()} AAM Ambiental & Mineral</p>
      </div>
    </div>
  );
}
