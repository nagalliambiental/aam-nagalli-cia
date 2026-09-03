import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ProcessoForm } from "@/components/forms/ProcessoForm";

export default async function NovoProcessoPage() {
  await requirePermissao("processo:criar");

  const [orgaos, tipos, empreendimentos, pessoas, minerarios, ambientais] = await Promise.all([
    prisma.orgao.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } }),
    prisma.tipoProcesso.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.empreendimento.findMany({
      where: { ativo: true, deletedAt: null },
      orderBy: { nome: "asc" },
    }),
    prisma.pessoa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null, natureza: "minerario" }, orderBy: { numero: "asc" }, select: { id: true, numero: true, fase: true } }),
    prisma.processo.findMany({
      where: { ativo: true, deletedAt: null, natureza: "ambiental" },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true, fase: true, apelido: true, numeroLicenca: true, empreendimento: { select: { nome: true, apelido: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Novo processo" subtitle="Abrir um novo processo (mineral ou ambiental)" />
      <Card>
        <CardHeader title="Dados do processo" />
        <div className="p-5">
          <ProcessoForm
            orgaos={orgaos.map((o) => ({ id: o.id, sigla: o.sigla, nome: o.nome }))}
            tipos={tipos.map((t) => ({ id: t.id, nome: t.nome }))}
            empreendimentos={empreendimentos.map((x) => ({ id: x.id, nome: x.nome, apelido: x.apelido }))}
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
            processosMinerarios={minerarios.map((p) => ({ id: p.id, numero: p.numero, fase: p.fase }))}
            processosAmbientais={ambientais.map((p) => ({ id: p.id, numero: p.numero, fase: p.fase, apelido: p.apelido, numeroLicenca: p.numeroLicenca, empreendimentoNome: p.empreendimento?.apelido || p.empreendimento?.nome || null }))}
          />
        </div>
      </Card>
    </div>
  );
}
