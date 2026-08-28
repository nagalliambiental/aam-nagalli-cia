import { prisma } from "@/lib/prisma";

/**
 * Registra uma ação de auditoria na tabela Historico.
 * entidadeTipo usa o catálogo TipoEntidade (ex.: "processo", "empresa").
 */
export async function audit(opts: {
  tipoEntidade: string;
  entidadeId: number | bigint;
  acao: string;
  campo?: string;
  valorAnterior?: string;
  valorNovo?: string;
  usuarioId?: number;
}) {
  const tipo = await prisma.tipoEntidade.findUnique({
    where: { nome: opts.tipoEntidade },
  });
  if (!tipo) return;

  await prisma.historico.create({
    data: {
      tipoEntidadeId: tipo.id,
      entidadeId: opts.entidadeId,
      acao: opts.acao,
      campo: opts.campo,
      valorAnterior: opts.valorAnterior ?? null,
      valorNovo: opts.valorNovo ?? null,
      usuarioId: opts.usuarioId ?? null,
    },
  });
}
