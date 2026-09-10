// Rate-limit simples em memória para o login (por e-mail).
// Limites via env: LOGIN_MAX_TENTATIVAS (padrão 5), LOGIN_BLOQUEIO_MIN (padrão 15).
// Nota: em serverless cada instância tem sua própria memória; protege contra
// força bruta casual, mas não substitui um WAF/rate-limit de borda.

type Registro = { falhas: number; bloqueadoAte: number; ultimaFalha: number };

const registros = new Map<string, Registro>();

const MAX_TENTATIVAS = Number(process.env.LOGIN_MAX_TENTATIVAS ?? 5) || 5;
const BLOQUEIO_MS = (Number(process.env.LOGIN_BLOQUEIO_MIN ?? 15) || 15) * 60 * 1000;
const JANELA_MS = 30 * 60 * 1000;

function chave(email: string) {
  return email.toLowerCase().trim();
}

function limparExpirados() {
  const agora = Date.now();
  for (const [k, r] of registros) {
    if (r.bloqueadoAte < agora && agora - r.ultimaFalha > JANELA_MS) registros.delete(k);
  }
  if (registros.size > 5000) {
    const maisAntigos = [...registros.entries()].sort((a, b) => a[1].ultimaFalha - b[1].ultimaFalha);
    for (const [k] of maisAntigos.slice(0, registros.size - 5000)) registros.delete(k);
  }
}

/** Minutos restantes de bloqueio, ou 0 se liberado. */
export function bloqueioRestanteMin(email: string): number {
  limparExpirados();
  const r = registros.get(chave(email));
  if (!r) return 0;
  const restante = r.bloqueadoAte - Date.now();
  return restante > 0 ? Math.ceil(restante / 60000) : 0;
}

export function registrarFalha(email: string) {
  limparExpirados();
  const k = chave(email);
  const r = registros.get(k) ?? { falhas: 0, bloqueadoAte: 0, ultimaFalha: 0 };
  r.falhas += 1;
  r.ultimaFalha = Date.now();
  if (r.falhas >= MAX_TENTATIVAS) r.bloqueadoAte = Date.now() + BLOQUEIO_MS;
  registros.set(k, r);
}

export function limparTentativas(email: string) {
  registros.delete(chave(email));
}
