import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";

export default async function PessoasPage() {
  const pessoas = await prisma.pessoa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { processosResp: true, tarefasResp: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Pessoas"
        subtitle="Contatos, responsáveis técnicos e colaboradores"
        actions={
          <Link href="/pessoas/nova">
            <Button>Nova pessoa</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-200">
          {pessoas.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pessoas/${p.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">{p.nome}</p>
                  <p className="text-sm text-muted">
                    {p.email ?? "sem e-mail"}
                    {p.telefone ? ` · ${p.telefone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>{p._count.processosResp} processos</p>
                    <p>{p._count.tarefasResp} tarefas</p>
                  </div>
                  <Badge tone={p.ativo ? "green" : "gray"}>
                    {p.ativo ? "ativo" : "inativo"}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
          {pessoas.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma pessoa cadastrada.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
