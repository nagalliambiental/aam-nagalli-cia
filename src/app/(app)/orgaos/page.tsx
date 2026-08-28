import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";

export default async function OrgaosPage() {
  const orgaos = await prisma.orgao.findMany({
    where: { ativo: true },
    orderBy: { sigla: "asc" },
    include: { _count: { select: { processos: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Órgãos"
        subtitle="Órgãos ambientais e minerários (ANM, IAT, IBAMA...)"
        actions={
          <Link href="/orgaos/nova">
            <Button>Novo órgão</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-200">
          {orgaos.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-navy-900">
                  {o.sigla} <span className="text-muted font-normal">· {o.nome}</span>
                </p>
                <p className="text-sm text-muted">
                  {o.ambito} · {o.nivel} · {o._count.processos} processos
                </p>
              </div>
              <Badge tone={o.ativo ? "green" : "gray"}>ativo</Badge>
            </li>
          ))}
          {orgaos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum órgão cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
