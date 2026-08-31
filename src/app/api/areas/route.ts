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
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  try {
    const area = await prisma.area.create({
      data: {
        nome,
        tipo: body.tipo ?? "imovel",
        matricula: body.matricula ?? null,
        areaHa: body.areaHa != null ? Number(body.areaHa) : null,
        municipio: body.municipio ?? null,
        uf: body.uf ?? null,
        situacao: body.situacao ?? "ativa",
        coordenadas: body.coordenadas ?? null,
        observacoes: body.observacoes ?? null,
      },
    });
    await audit({
      tipoEntidade: "area",
      entidadeId: area.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: area.nome,
    });
    return NextResponse.json({ id: area.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar área." }, { status: 500 });
  }
}
