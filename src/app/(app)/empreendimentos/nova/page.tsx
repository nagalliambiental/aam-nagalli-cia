import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { EmpreendimentoForm } from "@/components/forms/EmpreendimentoForm";

type SearchParams = Promise<{ empresaId?: string | string[] }>;

export default async function NovoEmpreendimentoPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissao("cadastro:criar");
  const sp = await searchParams;
  const empresaId = typeof sp.empresaId === "string" ? Number(sp.empresaId) : undefined;

  const empresas = await prisma.empresa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { razaoSocial: "asc" },
  });

  return (
    <div>
      <PageHeader title="Novo empreendimento" subtitle="Cadastro de unidade operacional" />
      <Card>
        <CardHeader title="Dados do empreendimento" />
        <div className="p-5">
          <EmpreendimentoForm
            empresas={empresas.map((x) => ({ id: x.id, razaoSocial: x.razaoSocial }))}
            initial={empresaId ? { empresaPrincipalId: empresaId } : undefined}
          />
        </div>
      </Card>
    </div>
  );
}
