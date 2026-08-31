import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { UsuarioForm } from "@/components/forms/UsuarioForm";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuarioId = Number(id);
  await requirePermissao("usuario:editar");

  const [usuario, perfis, pessoas] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId } }),
    prisma.perfil.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);
  if (!usuario) notFound();

  return (
    <div>
      <PageHeader title="Editar usuário" subtitle={usuario.email} />
      <Card>
        <CardHeader title="Dados de acesso" />
        <div className="p-5">
          <UsuarioForm
            usuarioId={usuario.id}
            perfis={perfis.map((p) => ({ id: p.id, nome: p.nome }))}
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
            initial={{
              email: usuario.email,
              perfilId: usuario.perfilId,
              pessoaId: usuario.pessoaId,
              ativo: usuario.ativo,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
