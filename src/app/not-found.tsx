import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <h1 className="text-3xl font-bold text-navy-900">Página não encontrada</h1>
      <p className="mt-2 text-muted">O recurso solicitado não existe ou foi removido.</p>
      <Link href="/" className="mt-6">
        <Button>Voltar ao painel</Button>
      </Link>
    </div>
  );
}
