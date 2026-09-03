import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { dataLocal } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:editar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const processoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!existing) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("numero" in body) data.numero = body.numero;
  if ("seiUrl" in body) data.seiUrl = body.seiUrl ?? null;
  if ("nup" in body) {
    const nup = body.nup ? String(body.nup).trim() || null : null;
    if (nup && !/^48\d{3}\.\d{6}\/\d{4}-\d{2}$/.test(nup)) {
      return NextResponse.json({ error: "NUP inválido. Formato esperado: 48xxx.000000/AAAA-DV" }, { status: 400 });
    }
    if (nup) {
      const outro = await prisma.processo.findUnique({ where: { nup }, select: { id: true, ativo: true, deletedAt: true } });
      if (outro && outro.id !== processoId && outro.ativo && !outro.deletedAt) {
        return NextResponse.json(
          { error: "Este NUP já pertence a outro processo.", existingId: outro.id },
          { status: 409 }
        );
      }
      // processo dono do NUP está excluído/inativo: libera o NUP
      if (outro && outro.id !== processoId) {
        await prisma.processo.update({ where: { id: outro.id }, data: { nup: null } });
      }
    }
    data.nup = nup;
  }
  if ("orgaoId" in body) data.orgaoId = Number(body.orgaoId);
  if ("tipoProcessoId" in body) data.tipoProcessoId = Number(body.tipoProcessoId);
  if ("empreendimentoId" in body) data.empreendimentoId = body.empreendimentoId ? Number(body.empreendimentoId) : null;
  if ("responsavelPessoaId" in body) data.responsavelPessoaId = body.responsavelPessoaId ? Number(body.responsavelPessoaId) : null;
  if ("natureza" in body) data.natureza = body.natureza === "ambiental" ? "ambiental" : "minerario";
  if ("assunto" in body) data.assunto = body.assunto ?? null;
  if ("fase" in body) data.fase = body.fase ?? null;
  if ("status" in body) data.status = body.status;
  if ("areaValor" in body) data.areaValor = body.areaValor != null ? Number(body.areaValor) : null;
  if ("areaUnidade" in body) data.areaUnidade = body.areaUnidade ?? "ha";
  if ("substancias" in body) data.substancias = body.substancias ?? null;
  if ("guiaUtilizacao" in body) data.guiaUtilizacao = body.guiaUtilizacao === true;
  // ambientais
  if ("numeroLicenca" in body) data.numeroLicenca = body.numeroLicenca ?? null;
  if ("numeroProtocolo" in body) data.numeroProtocolo = body.numeroProtocolo ?? null;
  if ("atividade" in body) data.atividade = body.atividade ?? null;
  if ("modalidade" in body) data.modalidade = body.modalidade ?? null;
  if ("modalidadeOutra" in body) data.modalidadeOutra = body.modalidadeOutra ?? null;
  if ("orgaoAmbiental" in body) data.orgaoAmbiental = body.orgaoAmbiental ?? null;
  if ("orgaoAmbientalOutro" in body) data.orgaoAmbientalOutro = body.orgaoAmbientalOutro ?? null;
  if ("validade" in body) data.validade = dataLocal(body.validade);
  if ("dataProtocolo" in body) data.dataProtocolo = dataLocal(body.dataProtocolo);
  if ("alertaDias" in body) data.alertaDias = body.alertaDias != null ? Number(body.alertaDias) : null;
  if ("dataLimiteRenovacao" in body) data.dataLimiteRenovacao = dataLocal(body.dataLimiteRenovacao);
  if ("alertaRenovacaoDias" in body) data.alertaRenovacaoDias = body.alertaRenovacaoDias != null ? Number(body.alertaRenovacaoDias) : null;
  if ("protocoloRenovacao" in body) data.protocoloRenovacao = body.protocoloRenovacao ?? null;
  if ("dataProtocoloRenovacao" in body) data.dataProtocoloRenovacao = dataLocal(body.dataProtocoloRenovacao);
  if ("condicionantes" in body) data.condicionantes = body.condicionantes ?? null;
  if ("dataAbertura" in body) data.dataAbertura = dataLocal(body.dataAbertura);
  if ("descricao" in body) data.descricao = body.descricao ?? null;
  if ("observacoes" in body) data.observacoes = body.observacoes ?? null;

  try {
    const processo = await prisma.processo.update({ where: { id: processoId }, data: data as never });

    // Substitui os vínculos (ambiental ↔ minerário) quando enviados.
    if (Array.isArray(body.vinculos)) {
      const vinculos = body.vinculos.map(Number).filter((x: number) => Number.isInteger(x));
      await prisma.processoVinculo.deleteMany({
        where: { OR: [{ processoAmbientalId: processoId }, { processoMinerarioId: processoId }] },
      });
      if (vinculos.length) {
        const dataVinculo = processo.natureza === "ambiental"
          ? vinculos.map((m: number) => ({ processoAmbientalId: processoId, processoMinerarioId: m }))
          : vinculos.map((a: number) => ({ processoAmbientalId: a, processoMinerarioId: processoId }));
        await prisma.processoVinculo.createMany({ data: dataVinculo, skipDuplicates: true });
      }
    }

    await audit({ tipoEntidade: "processo", entidadeId: processo.id, acao: "editar", usuarioId: Number(session.user.id) });
    return NextResponse.json({ id: processo.id });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.user.permissoes?.includes("processo:excluir")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const processoId = Number(id);
  const agora = new Date();
  // Soft-delete do processo e dos filhos (para não deixar prazos/exigências órfãos)
  await prisma.$transaction([
    prisma.processo.update({ where: { id: processoId }, data: { ativo: false, deletedAt: agora } }),
    prisma.prazo.updateMany({ where: { processoId, ativo: true }, data: { ativo: false, deletedAt: agora } }),
    prisma.exigencia.updateMany({ where: { processoId, ativo: true }, data: { ativo: false, deletedAt: agora } }),
  ]);
  await audit({ tipoEntidade: "processo", entidadeId: processoId, acao: "excluir", usuarioId: Number(session.user.id) });
  return NextResponse.json({ ok: true });
}
