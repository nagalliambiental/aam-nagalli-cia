import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FaturaForm } from "@/components/comercial/FaturaForm";

export default async function NovaFaturaPage() {
  const s = await auth();
  if (s?.user?.perfilNome !== "Administrador") redirect("/");

  const [empresas, empreendimentos] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { razaoSocial: "asc" }, select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true, apelido: true, empresaPrincipalId: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Nova fatura" subtitle="Monte a fatura com os itens do cliente" />
      <Card>
        <CardHeader title="Dados da fatura" />
        <div className="p-5">
          <FaturaForm
            empresas={empresas.map((e) => ({ id: e.id, nome: e.nomeFantasia || e.razaoSocial, cnpj: e.cnpj }))}
            empreendimentos={empreendimentos.map((e) => ({ id: e.id, nome: e.apelido || e.nome, empresaId: e.empresaPrincipalId }))}
          />
        </div>
      </Card>
    </div>
  );
}
