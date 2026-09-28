import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sincronizarLegislacaoIat } from "@/lib/legislacao-iat-sincronizar";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:editar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  try {
    const resultado = await sincronizarLegislacaoIat();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao sincronizar." }, { status: 502 });
  }
}
