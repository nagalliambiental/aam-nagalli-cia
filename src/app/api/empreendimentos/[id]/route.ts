import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const empreendimentoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("nome" in body) data.nome = body.nome;
  if ("apelido" in body) data.apelido = body.apelido ?? null;
  if ("tipo" in body) data.tipo = body.tipo ?? null;
  if ("municipio" in body) data.municipio = body.municipio ?? null;
  if ("uf" in body) data.uf = body.uf ?? null;
  if ("cep" in body) data.cep = body.cep ?? null;
  if ("endereco" in body) data.endereco = body.endereco ?? null;
  if ("status" in body) data.status = body.status ?? "ativo";
  if ("descricao" in body) data.descricao = body.descricao ?? null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;
  if ("empresaPrincipalId" in body) data.empresaPrincipalId = Number(body.empresaPrincipalId);
  if ("filial" in body) data.filial = body.filial === true || body.filial === "sim";
  if ("cnpj" in body) {
    const cnpj = String(body.cnpj ?? "").replace(/\D/g, "");
    data.cnpj = cnpj || null;
  }
  // Filial exige CNPJ próprio; sem filial, usa o CNPJ do cliente principal.
  if (data.filial === true && data.cnpj === undefined && !("cnpj" in body)) {
    const atual = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId }, select: { cnpj: true } });
    if (!atual?.cnpj) {
      return NextResponse.json({ error: "CNPJ é obrigatório para empreendimento marcado como filial." }, { status: 400 });
    }
  }
  if (data.filial === false || ("filial" in body && data.filial !== true)) {
    data.cnpj = null;
  }

  // Guarda de duplicado ao editar nome/apelido/empresa (apelido é diferencial), excluindo a si.
  if ("nome" in body || "apelido" in body || "empresaPrincipalId" in body) {
    const atual = await prisma.empreendimento.findUnique({
      where: { id: empreendimentoId },
      select: { nome: true, apelido: true, empresaPrincipalId: true },
    });
    const novoNome = ("nome" in body ? (body.nome as string) : atual?.nome) ?? "";
    const novoApelido = ("apelido" in body ? ((body.apelido as string) ?? "") : (atual?.apelido ?? ""))?.trim() || null;
    const novaEmpresa = "empresaPrincipalId" in body ? Number(body.empresaPrincipalId) : atual?.empresaPrincipalId;
    const dup = await prisma.empreendimento.findFirst({
      where: {
        empresaPrincipalId: novaEmpresa,
        nome: { equals: novoNome, mode: "insensitive" },
        ...(novoApelido ? { apelido: { equals: novoApelido, mode: "insensitive" } } : { apelido: null }),
        ativo: true,
        deletedAt: null,
        id: { not: empreendimentoId },
      },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ error: "Empreendimento já cadastrado.", existingId: dup.id }, { status: 409 });
    }
  }

  try {
    const emp = await prisma.empreendimento.update({
      where: { id: empreendimentoId },
      data: data as never,
    });

    // Mantém o vínculo principal coerente ao trocar a empresa principal
    if (data.empresaPrincipalId) {
      await prisma.empreendimentoEmpresa.upsert({
        where: {
          empreendimentoId_empresaId_papel: {
            empreendimentoId,
            empresaId: data.empresaPrincipalId as number,
            papel: "operador",
          },
        },
        update: { principal: true },
        create: {
          empreendimentoId,
          empresaId: data.empresaPrincipalId as number,
          papel: "operador",
          principal: true,
        },
      });
    }

    await audit({
      tipoEntidade: "empreendimento",
      entidadeId: emp.id,
      acao: "editar",
      usuarioId: Number(session.user.id),
    });
    return NextResponse.json({ id: emp.id });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:excluir")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const empreendimentoId = Number(id);

  // Exclusão definitiva: o banco em cascata remove processos, licenças,
  // tarefas, faturas e vínculos ligados a este empreendimento.
  const alvo = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId }, select: { id: true, nome: true } });
  if (!alvo) {
    return NextResponse.json({ error: "Empreendimento não encontrado." }, { status: 404 });
  }
  await prisma.empreendimento.delete({ where: { id: empreendimentoId } });

  await audit({
    tipoEntidade: "empreendimento",
    entidadeId: empreendimentoId,
    acao: "excluir",
    usuarioId: Number(session.user.id),
    valorNovo: alvo.nome,
  });
  return NextResponse.json({ ok: true });
}
