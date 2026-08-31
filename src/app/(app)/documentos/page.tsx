import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function DocumentosPage() {
  await requirePermissao("documento:ler");

  const documentos = await prisma.documento.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { criadoEm: "desc" },
    include: {
      responsavel: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Gerenciamento documental"
        actions={
          <Link href="/documentos/novo">
            <Button>Novo documento</Button>
          </Link>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-200">
          {documentos.map((d) => (
            <li key={d.id}>
              <Link
                href={`/documentos/${d.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-navy-900">{d.nome}</p>
                  <p className="text-sm text-muted">
                    {d.tipo}
                    {d.categoria && d.categoria !== "documento" ? ` · ${d.categoria}` : ""}
                    {d.responsavel ? ` · ${d.responsavel.nome}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right text-sm text-muted sm:block">
                    <p>v{d.versao}</p>
                    <p>{formatDate(d.data)}</p>
                  </div>
                  <Badge tone={d.status === "ativo" ? "green" : "amber"}>{d.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
          {documentos.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted">
              Nenhum documento cadastrado.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
