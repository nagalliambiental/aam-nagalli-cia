import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("cadastro:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const nome = (body.nome as string) ?? "";
  const empresaPrincipalId = body.empresaPrincipalId ? Number(body.empresaPrincipalId) : null;
  const apelido = (body.apelido as string | undefined)?.trim() || null;

  if (!nome || !empresaPrincipalId) {
    return NextResponse.json(
      { error: "Nome e empresa principal são obrigatórios" },
      { status: 400 }
    );
  }

  // Impede empreendimento duplicado: mesma empresa principal + mesmo nome + mesmo apelido.
  // O apelido é tratado como diferencial (ex.: "Pedreira do Trevo" FILIAL e MATRIZ são distintos).
  const jaExiste = await prisma.empreendimento.findFirst({
    where: {
      empresaPrincipalId,
      nome: { equals: nome, mode: "insensitive" },
      ...(apelido ? { apelido: { equals: apelido, mode: "insensitive" } } : { apelido: null }),
      ativo: true,
      deletedAt: null,
    },
    select: { id: true, nome: true, apelido: true },
  });
  if (jaExiste) {
    return NextResponse.json(
      { error: "Empreendimento já cadastrado.", existingId: jaExiste.id, existingNome: jaExiste.nome, existingApelido: jaExiste.apelido },
      { status: 409 }
    );
  }

  try {
    const emp = await prisma.empreendimento.create({
      data: {
        nome,
        apelido,
        empresaPrincipalId,
        tipo: body.tipo ?? "pedreira",
        municipio: body.municipio ?? null,
        uf: body.uf ?? null,
        cep: body.cep ?? null,
        endereco: body.endereco ?? null,
        status: body.status ?? "ativo",
        descricao: body.descricao ?? null,
        observacoes: body.observacoes ?? null,
      },
    });

    // Registrar também o vínculo na associação (papel operador/principal)
    await prisma.empreendimentoEmpresa.create({
      data: { empreendimentoId: emp.id, empresaId: empresaPrincipalId, papel: "operador", principal: true },
    });

    await audit({
      tipoEntidade: "empreendimento",
      entidadeId: emp.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: emp.nome,
    });

    return NextResponse.json({ id: emp.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar empreendimento." }, { status: 500 });
  }
}
