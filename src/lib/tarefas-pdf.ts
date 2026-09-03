import { extrairTextoDoArquivo } from "@/lib/extrair-licenca";
import { dividirCondicionantes } from "@/lib/condicionantes";

export interface ItemTarefaPdf {
  texto: string;
  prazo: string | null; // yyyy-mm-dd
}

function extrairPrazo(texto: string): string | null {
  const m = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // "no prazo de X dias/meses" -> não tem data exata; retorna null (editar manualmente)
  const m2 = texto.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return null;
}

export async function extrairTarefasDePdf(buffer: Buffer, ext: string): Promise<ItemTarefaPdf[]> {
  const texto = await extrairTextoDoArquivo(buffer, ext);
  const itens = dividirCondicionantes(texto);
  return itens
    .map((it) => ({ texto: it, prazo: extrairPrazo(it) }))
    .filter((it) => it.texto.trim().length > 5)
    .slice(0, 60);
}
