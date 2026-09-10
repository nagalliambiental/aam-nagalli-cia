const API = "https://api.github.com";

export function cronToHoraBrasilia(cron: string) {
  const match = cron.match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
  if (!match) return "07:00";
  const hora = (Number(match[2]) + 21) % 24;
  return `${String(hora).padStart(2, "0")}:${String(Number(match[1])).padStart(2, "0")}`;
}

export function horaBrasiliaToCron(hora: string) {
  const match = hora.match(/^(\d{2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Informe um horário válido.");
  const utcHour = (Number(match[1]) + 3) % 24;
  return `${Number(match[2])} ${utcHour} * * *`;
}

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = (process.env.GITHUB_REPOSITORY ?? "nagalliambiental/amm-nagalli-cia")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  if (!token) throw new Error("GITHUB_TOKEN não configurado na Vercel.");
  return { token, repository };
}

async function githubFetch(path: string, init?: RequestInit) {
  const { token } = githubConfig();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Repositório ou workflow não encontrado. Confira GITHUB_REPOSITORY e se o GITHUB_TOKEN tem acesso ao repositório nagalliambiental/amm-nagalli-cia.");
    throw new Error(`GitHub API retornou ${response.status}.`);
  }
  return response;
}

export async function getDouWorkflowCron() {
  const { repository } = githubConfig();
  const response = await githubFetch(`/repos/${repository}/contents/.github/workflows/dou.yml?ref=main`);
  const data = await response.json() as { content: string; sha: string };
  const content = Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8");
  const cron = content.match(/cron:\s*["']([^"']+)["']/)?.[1] ?? "0 10 * * *";
  return { cron, sha: data.sha };
}

export async function updateDouWorkflowCron(cron: string) {
  if (!/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/.test(cron)) throw new Error("Expressão Cron inválida. Use cinco campos, por exemplo: 0 10 * * *.");
  const { repository } = githubConfig();
  const response = await githubFetch(`/repos/${repository}/contents/.github/workflows/dou.yml?ref=main`);
  const data = await response.json() as { content: string; sha: string };
  const content = Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8");
  const updated = content.replace(/cron:\s*["'][^"']+["']/, `cron: "${cron}"`);
  if (updated === content) throw new Error("Não foi possível localizar o Cron do DOU no workflow.");
  const saved = await githubFetch(`/repos/${repository}/contents/.github/workflows/dou.yml`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `Configura horário do cron DOU: ${cron}`, content: Buffer.from(updated).toString("base64"), sha: data.sha, branch: "main" }),
  });
  return saved.json();
}
