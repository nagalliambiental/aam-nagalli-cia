import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card } from "@/components/ui";
import { BlocosPanel } from "@/components/config/BlocosPanel";

export default async function BlocosExigenciaPage() {
  await requirePermissao("config:ler");

  const [blocos, pessoas] = await Promise.all([
    prisma.blocoExigenciaTemplate.findMany({
      orderBy: [{ fase: "asc" }, { ordem: "asc" }],
      include: { responsavel: true },
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);

  const fases = ["Requerimento de Pesquisa", "Autorização de Pesquisa", "Direito de Requerer a Lavra", "Requerimento de Lavra", "Concessão de Lavra"];

  return (
    <div>
      <PageHeader
        title="Blocos de exigência por fase"
        subtitle="Templates que geram exigências e prazos automaticamente ao mudar a fase do processo"
      />
      <Card>
        <div className="p-5">
          <BlocosPanel blocos={blocos} pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))} fases={fases} />
        </div>
      </Card>
    </div>
  );
}
