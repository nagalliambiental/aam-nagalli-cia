import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AreaForm } from "@/components/forms/AreaForm";

export default async function EditarAreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const areaId = Number(id);
  await requirePermissao("cadastro:editar");

  const area = await prisma.area.findFirst({
    where: { id: areaId, ativo: true, deletedAt: null },
  });
  if (!area) notFound();

  return (
    <div>
      <PageHeader title="Editar área" subtitle={area.nome} />
      <Card>
        <CardHeader title="Dados da área" />
        <div className="p-5">
          <AreaForm
            areaId={area.id}
            initial={{
              nome: area.nome,
              tipo: area.tipo ?? undefined,
              matricula: area.matricula ?? undefined,
              areaHa: area.areaHa ?? undefined,
              municipio: area.municipio ?? undefined,
              uf: area.uf ?? undefined,
              situacao: area.situacao ?? undefined,
              coordenadas: area.coordenadas ?? undefined,
              observacoes: area.observacoes ?? undefined,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
