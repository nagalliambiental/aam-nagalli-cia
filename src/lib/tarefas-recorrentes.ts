import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

function somaDias(base: Date, dias: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + dias);
  return d;
}

export function hojeSP(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/**
 * Prevê a próxima data de uma regra recorrente a partir da ocorrência atual.
 * Nunca devolve data no passado: se o vencimento base já passou, conta a partir de hoje.
 */
export function preverProxima(
  intervaloDias: number,
  base: Date | null,
  hoje: Date = hojeSP(),
): Date {
  if (!base) return somaDias(hoje, intervaloDias);
  const proxima = somaDias(base, intervaloDias);
  return proxima.getTime() <= hoje.getTime() ? somaDias(hoje, intervaloDias) : proxima;
}

export type ResultadoGeracao = { gerada: boolean; novaTarefaId?: number; motivo?: string };

/**
 * Ao concluir uma tarefa vinculada a uma regra recorrente, cria a próxima ocorrência.
 * Copia título, descrição, responsável, vínculos e prioridade; calcula o próximo prazo
 * pelo intervalo da regra; notifica o responsável.
 */
export async function gerarProximaOcorrencia(
  tarefaId: number,
  usuarioId?: number,
): Promise<ResultadoGeracao> {
  const tarefa = await prisma.tarefa.findUnique({ where: { id: tarefaId }, include: { recorrencia: true } });
  if (!tarefa?.recorrencia) return { gerada: false, motivo: "sem_recorrencia" };

  const regra = tarefa.recorrencia;
  if (!regra.ativo) return { gerada: false, motivo: "regra_pausada" };
  if (tarefa.status !== "concluida") return { gerada: false, motivo: "nao_concluida" };

  const outraViva = await prisma.tarefa.findFirst({
    where: { tarefaRecorrenteId: regra.id, id: { not: tarefaId }, ativo: true, deletedAt: null },
    select: { id: true },
  });
  if (outraViva) return { gerada: false, motivo: "ja_gerada" };

  const hoje = hojeSP();
  const novaPrazo = preverProxima(regra.intervaloDias, tarefa.prazoData ?? tarefa.dataLimite, hoje);

  if (regra.fimRecorrencia && novaPrazo.getTime() > regra.fimRecorrencia.getTime()) {
    await prisma.tarefaRecorrente.update({ where: { id: regra.id }, data: { ativo: false } });
    return { gerada: false, motivo: "fim_alcancado" };
  }

  const temPrazo = !!tarefa.prazoData;
  const temLimite = !!tarefa.dataLimite;
  const offsetDias =
    temPrazo && temLimite && tarefa.prazoData && tarefa.dataLimite
      ? Math.round((tarefa.dataLimite.getTime() - tarefa.prazoData.getTime()) / 86400000)
      : 0;
  const novoDataLimite = temLimite ? somaDias(novaPrazo, offsetDias) : null;

  const nova = await prisma.tarefa.create({
    data: {
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      observacoes: tarefa.observacoes,
      prioridade: tarefa.prioridade,
      status: "nao_iniciado",
      prazoData: novaPrazo,
      dataLimite: novoDataLimite,
      alertaDias: tarefa.alertaDias,
      alertaDataLimite: tarefa.alertaDataLimite,
      visibilidade: tarefa.visibilidade,
      responsavelPessoaId: tarefa.responsavelPessoaId,
      empreendimentoId: tarefa.empreendimentoId,
      processoId: tarefa.processoId,
      criadorUsuarioId: tarefa.criadorUsuarioId,
      tarefaRecorrenteId: regra.id,
    },
  });

  await prisma.tarefaRecorrente.update({ where: { id: regra.id }, data: { ultimaTarefaId: nova.id } });

  const usuario = await prisma.usuario.findUnique({
    where: { pessoaId: regra.responsavelPessoaId },
    select: { id: true },
  });
  await prisma.notificacao.create({
    data: {
      tipo: "tarefa_recorrente",
      mensagem: `Nova ocorrência recorrente: ${nova.titulo} (a cada ${regra.intervaloDias} dias)`,
      url: `/tarefas/${nova.id}`,
      tarefaId: nova.id,
      destinatarioUsuarioId: usuario?.id ?? null,
    },
  });

  await audit({
    tipoEntidade: "tarefa",
    entidadeId: nova.id,
    acao: "criar",
    usuarioId,
    valorNovo: `${nova.titulo} (recorrente)`,
  });

  return { gerada: true, novaTarefaId: nova.id };
}
