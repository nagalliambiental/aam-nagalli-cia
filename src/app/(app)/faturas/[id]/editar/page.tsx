import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FaturaForm, FaturaInicial } from "@/components/comercial/FaturaForm";

export default async function EditarFaturaPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (s?.user?.perfilNome !== "Administrador") redirect("/");
  const { id } = await params;
  const fatura = await prisma.fatura.findFirst({ where: { id: Number(id), ativo: true, deletedAt: null }, include: { itens: { orderBy: { id: "asc" } } } });
  if (!fatura) notFound();
  const [empresas, empreendimentos] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { razaoSocial: "asc" }, select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true, apelido: true, empresaPrincipalId: true } }),
  ]);
  const dateInput = (date: Date | null) => date ? new Date(date).toISOString().slice(0, 10) : "";
  const initial: FaturaInicial = {
    id: fatura.id,
    empresaId: fatura.empresaId,
    empreendimentoId: fatura.empreendimentoId,
    referencia: fatura.referencia ?? "",
    periodoInicio: dateInput(fatura.periodoInicio),
    periodoFim: dateInput(fatura.periodoFim),
    vencimento: dateInput(fatura.vencimento),
    observacoes: fatura.observacoes ?? "",
    itens: fatura.itens.map((item) => ({ data: dateInput(item.data), identificacao: item.identificacao, descricao: item.descricao ?? "", qtde: String(item.qtde), horaTecnica: String(item.horaTecnica), descontoPct: item.descontoPct == null ? "" : String(item.descontoPct), outrosCustos: String(item.outrosCustos) })),
  };
  return <div><PageHeader title={`Editar fatura Nº ${fatura.numero}/${fatura.ano}`} subtitle="Atualize os dados e os itens da fatura" /><Card><CardHeader title="Dados da fatura" /><div className="p-5"><FaturaForm empresas={empresas.map((e) => ({ id: e.id, nome: e.nomeFantasia || e.razaoSocial, cnpj: e.cnpj }))} empreendimentos={empreendimentos.map((e) => ({ id: e.id, nome: e.apelido || e.nome, empresaId: e.empresaPrincipalId }))} initial={initial} /></div></Card></div>;
}
