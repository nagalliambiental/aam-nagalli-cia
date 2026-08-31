import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PerfilForm } from "@/components/forms/PerfilForm";

export default async function EditarPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfilId = Number(id);
  await requirePermissao("config:editar");

  const [perfil, permissoes] = await Promise.all([
    prisma.perfil.findUnique({
      where: { id: perfilId },
      include: { permissoes: true },
    }),
    prisma.permissao.findMany({ orderBy: [{ modulo: "asc" }, { acao: "asc" }] }),
  ]);
  if (!perfil) notFound();

  return (
    <div>
      <PageHeader title="Editar perfil" subtitle={perfil.nome} />
      <Card>
        <CardHeader title="Dados do perfil e permissões" />
        <div className="p-5">
          <PerfilForm
            perfilId={perfil.id}
            permissoes={permissoes.map((p) => ({ id: p.id, chave: p.chave, modulo: p.modulo, acao: p.acao }))}
            initial={{
              nome: perfil.nome,
              descricao: perfil.descricao ?? undefined,
              sistema: perfil.sistema,
              selecionadas: new Set(perfil.permissoes.map((pp) => pp.permissaoId)),
            }}
          />
        </div>
      </Card>
    </div>
  );
}
