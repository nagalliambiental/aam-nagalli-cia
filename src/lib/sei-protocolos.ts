import { prisma } from "@/lib/prisma";
import type { ProtocoloSei } from "@/lib/sei";

export async function salvarProtocolosSei(processoId: number, protocolos: ProtocoloSei[]) {
  if (protocolos.length === 0) return [];
  const existentes = await prisma.seiProtocolo.findMany({ where: { processoId, numero: { in: protocolos.map((p) => p.numero) } }, select: { numero: true } });
  const numerosExistentes = new Set(existentes.map((p) => p.numero));
  const novos = protocolos.filter((p) => !numerosExistentes.has(p.numero));
  if (novos.length === 0) return [];
  await prisma.seiProtocolo.createMany({ data: novos.map((p) => ({ processoId, ...p })), skipDuplicates: true });
  const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { numero: true } });
  if (processo) {
    await prisma.notificacao.createMany({
      data: novos.map((p) => ({
        tipo: "sei_protocolo",
        mensagem: `Novo protocolo SEI ${p.numero} no processo ${processo.numero}: ${p.tipo}`,
        processoId,
        url: p.url,
        destinatarioUsuarioId: null,
      })),
    });
  }
  return novos;
}
