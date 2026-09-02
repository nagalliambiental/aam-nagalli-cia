import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { dataLocal } from "@/lib/format";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!session.user.permissoes?.includes("processo:criar")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const natureza = body.natureza === "ambiental" ? "ambiental" : "minerario";

  // Ambiental não exige o número do cadastro minerário: usa protocolo/licença,
  // senão gera um identificador (AMB-*).
  let numero = (body.numero as string) ?? "";
  if (!numero && natureza === "ambiental") {
    numero = String(body.numeroProtocolo || body.numeroLicenca || "").trim();
  }
  if (!numero && natureza === "ambiental") {
    numero = `AMB-${Date.now()}`;
  }
  if (!numero) {
    return NextResponse.json({ error: "Número é obrigatório" }, { status: 400 });
  }

  const nup = body.nup ? String(body.nup).replace(/\s/g, "").trim() || null : null;
  if (nup && !/^48\d{3}\.\d{6}\/\d{4}-\d{2}$/.test(nup)) {
    return NextResponse.json({ error: "NUP inválido. Formato esperado: 48xxx.000000/AAAA-DV" }, { status: 400 });
  }

  // Se o NUP já existe, não duplica: informa o processo existente.
  // Processos excluídos (soft-delete) não contam — libera o NUP para recriação.
  if (nup) {
    const existente = await prisma.processo.findUnique({ where: { nup }, select: { id: true, numero: true, ativo: true, deletedAt: true } });
    if (existente) {
      if (existente.ativo && !existente.deletedAt) {
        return NextResponse.json(
          { error: "Já existe um processo com este NUP.", existingId: existente.id, existingNumero: existente.numero },
          { status: 409 }
        );
      }
      // processo excluído/inativo detém o NUP: limpa para permitir recriar
      await prisma.processo.update({ where: { id: existente.id }, data: { nup: null } });
    }
  }

  // Auto-mapeia tipoProcesso e órgão pelo tronco (mineral/ambiental), se não vierem do form.
  // Fallback: se não houver linha com tronco/ambito preenchido, usa qualquer tipo/órgão.
  const tipoProcesso =
    (await prisma.tipoProcesso.findFirst({ where: { tronco: natureza } })) ??
    (await prisma.tipoProcesso.findFirst());
  const orgao =
    (await prisma.orgao.findFirst({ where: { ambito: natureza } })) ??
    (await prisma.orgao.findFirst());

  try {
    const processo = await prisma.processo.create({
      data: {
        numero,
        nup,
        orgaoId: body.orgaoId ?? orgao?.id,
        tipoProcessoId: body.tipoProcessoId ?? tipoProcesso?.id,
        empreendimentoId: body.empreendimentoId ?? null,
        responsavelPessoaId: body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null,
        natureza,
        fase: body.fase ?? null,
        status: body.status ?? "em_andamento",
        areaValor: body.areaValor != null ? Number(body.areaValor) : null,
        areaUnidade: body.areaUnidade ?? "ha",
        substancias: body.substancias ?? null,
        guiaUtilizacao: body.guiaUtilizacao === true,
        // ambientais
        numeroLicenca: body.numeroLicenca ?? null,
        numeroProtocolo: body.numeroProtocolo ?? null,
        atividade: body.atividade ?? null,
        modalidade: body.modalidade ?? null,
        modalidadeOutra: body.modalidadeOutra ?? null,
        orgaoAmbiental: body.orgaoAmbiental ?? null,
        orgaoAmbientalOutro: body.orgaoAmbientalOutro ?? null,
        validade: dataLocal(body.validade),
        dataProtocolo: dataLocal(body.dataProtocolo),
        alertaDias: body.alertaDias != null ? Number(body.alertaDias) : null,
        condicionantes: body.condicionantes ?? null,
        dataAbertura: dataLocal(body.dataAbertura) ?? new Date(),
        descricao: body.descricao ?? null,
        observacoes: body.observacoes ?? null,
      },
    });

    await audit({
      tipoEntidade: "processo",
      entidadeId: processo.id,
      acao: "criar",
      usuarioId: Number(session.user.id),
      valorNovo: processo.numero,
    });

    return NextResponse.json({ id: processo.id }, { status: 201 });
  } catch (e) {
    console.error("Erro ao criar processo:", e);
    const msg = e instanceof Error ? e.message : "Erro ao criar processo.";
    return NextResponse.json({ error: "Erro ao criar processo.", detail: msg }, { status: 500 });
  }
}
