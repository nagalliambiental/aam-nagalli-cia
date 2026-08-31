import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { UsuarioForm } from "@/components/forms/UsuarioForm";

export default async function NovoUsuarioPage() {
  await requirePermissao("usuario:criar");

  const [perfis, pessoas] = await Promise.all([
    prisma.perfil.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Novo usuário" subtitle="Criar acesso para um novo usuário" />
      <Card>
        <CardHeader title="Dados de acesso" />
        <div className="p-5">
          <UsuarioForm
            perfis={perfis.map((p) => ({ id: p.id, nome: p.nome }))}
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
          />
        </div>
      </Card>
    </div>
  );
}
