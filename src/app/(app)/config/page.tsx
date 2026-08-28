import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui";

export default async function ConfigPage() {
  const perfis = await prisma.perfil.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { usuarios: true, permissoes: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Perfis, permissões e usuários" />

      <Card>
        <CardHeader title="Perfis de acesso" />
        <ul className="divide-y divide-slate-100">
          {perfis.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="font-medium text-navy-900">
                  {p.nome}{" "}
                  {p.sistema && <Badge tone="gold">sistema</Badge>}
                </p>
                <p className="text-xs text-muted">{p.descricao ?? "—"}</p>
              </div>
              <div className="text-right text-sm text-muted">
                <p>{p._count.usuarios} usuários</p>
                <p>{p._count.permissoes} permissões</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
