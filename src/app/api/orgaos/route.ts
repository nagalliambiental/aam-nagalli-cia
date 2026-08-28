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
  const sigla = ((body.sigla as string) ?? "").toUpperCase();

  if (!nome || !sigla) {
    return NextResponse.json({ error: "Nome e sigla são obrigatórios" }, { status: 400 });
  }

  try {
    const orgao = await prisma.orgao.create({
      data: {
        nome,
        sigla,
        nivel: body.nivel ?? "estadual",
        ambito: body.ambito ?? "ambiental",
        site: body.site ?? null,
      },
    });
    await audit({
      tipoEntidade: "orgao",
      entidadeId: orgao.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: orgao.sigla,
    });
    return NextResponse.json({ id: orgao.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Já existe órgão com esta sigla ou erro ao criar." },
      { status: 500 }
    );
  }
}
