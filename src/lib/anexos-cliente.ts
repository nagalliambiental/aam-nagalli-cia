export const TAMANHO_MAXIMO_ANEXO = 4 * 1024 * 1024;

/**
 * Envia os arquivos selecionados para a tarefa criada.
 * Retorna quantos foram enviados e as falhas (nome + motivo).
 */
export async function enviarAnexosTarefa(
  tarefaId: number,
  arquivos: File[],
): Promise<{ enviados: number; falhas: string[] }> {
  const falhas: string[] = [];
  let enviados = 0;

  for (const arquivo of arquivos) {
    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) {
      falhas.push(`${arquivo.name}: acima de 4 MB`);
      continue;
    }
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      const res = await fetch(`/api/tarefas/${tarefaId}/anexos`, { method: "POST", body: fd });
      if (res.ok) {
        enviados += 1;
      } else {
        const d = await res.json().catch(() => ({}));
        falhas.push(`${arquivo.name}: ${d.error ?? "erro ao enviar"}`);
      }
    } catch {
      falhas.push(`${arquivo.name}: erro de conexão`);
    }
  }

  return { enviados, falhas };
}
