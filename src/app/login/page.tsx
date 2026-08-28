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
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #021e4c 0%, #011129 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gold-500 text-xl font-bold text-navy-900">
            AAM
          </div>
          <h1 className="text-xl font-bold text-white">
            Ambiental <span className="text-gold-500">&amp;</span> Mineral
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Nagalli &amp; Cia LTDA
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-xl">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
