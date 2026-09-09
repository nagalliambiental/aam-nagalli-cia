import { prisma } from "@/lib/prisma";
import type { ProtocoloSei } from "@/lib/sei";

function dataSei(data?: string | null) {
  const match = data?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12);
}

function recente(data?: string | null) {
  const evento = dataSei(data);
  if (!evento) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diferenca = hoje.getTime() - evento.getTime();
  return diferenca >= -86400000 && diferenca <= 86400000;
}

export async function salvarProtocolosSei(processoId: number, protocolos: ProtocoloSei[], notificar = false) {
  if (protocolos.length === 0) return [];
  const existentes = await prisma.seiProtocolo.findMany({ where: { processoId, numero: { in: protocolos.map((p) => p.numero) } }, select: { id: true, numero: true, url: true } });
  const existentesPorNumero = new Map(existentes.map((p) => [p.numero, p]));
  for (const protocolo of protocolos) {
    const existente = existentesPorNumero.get(protocolo.numero);
    if (existente && protocolo.url && existente.url !== protocolo.url) {
      await prisma.seiProtocolo.update({ where: { id: existente.id }, data: { url: protocolo.url, tipo: protocolo.tipo, data: protocolo.data, dataInclusao: protocolo.dataInclusao, unidade: protocolo.unidade } });
      await prisma.notificacao.updateMany({ where: { processoId, tipo: "sei_protocolo", mensagem: { contains: protocolo.numero } }, data: { url: protocolo.url } });
    }
  }
  const numerosExistentes = new Set(existentes.map((p) => p.numero));
  const novos = protocolos.filter((p) => !numerosExistentes.has(p.numero));
  if (novos.length === 0) return [];
  await prisma.seiProtocolo.createMany({ data: novos.map((p) => ({ processoId, ...p })), skipDuplicates: true });
  const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { numero: true } });
  if (processo && notificar) {
    const avisos = novos.filter((p) => recente(p.data) || recente(p.dataInclusao));
    await prisma.notificacao.createMany({
      data: avisos.map((p) => ({
        tipo: "sei_protocolo",
        mensagem: `Novo protocolo SEI ${p.numero} no processo ${processo.numero}: ${p.tipo} (${p.data || p.dataInclusao})`,
        dataEvento: dataSei(p.data) ?? dataSei(p.dataInclusao),
        processoId,
        url: p.url,
        destinatarioUsuarioId: null,
      })),
    });
  }
  return novos;
}
