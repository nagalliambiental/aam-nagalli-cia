import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { UserCog, ShieldCheck, Users } from "lucide-react";

export default async function PerfisPage() {
  await requirePermissao("config:ler");

  const perfis = await prisma.perfil.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { usuarios: true, permissoes: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Perfis de acesso"
        subtitle="Controle de permissões por perfil de usuário"
        actions={
          <Link href="/perfis/nova">
            <Button>Novo perfil</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-100">
          {perfis.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-navy-900">
                    {p.nome}{" "}
                    {p.sistema && <Badge tone="gold">sistema</Badge>}
                  </p>
                  <p className="text-xs text-muted">{p.descricao ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right text-xs text-muted">
                  <p className="flex items-center justify-end gap-1">
                    <Users className="h-3.5 w-3.5" /> {p._count.usuarios} usuários
                  </p>
                  <p className="mt-0.5">{p._count.permissoes} permissões</p>
                </div>
                <Link
                  href={`/perfis/${p.id}/editar`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:underline"
                >
                  <UserCog className="h-4 w-4" /> Editar
                </Link>
              </div>
            </li>
          ))}
          {perfis.length === 0 && (
            <li className="px-5 py-12 text-center text-muted">Nenhum perfil cadastrado.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
