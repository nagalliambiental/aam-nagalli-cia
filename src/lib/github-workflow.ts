const API = "https://api.github.com";

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY ?? "nagalliambiental/amm-nagalli-cia";
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
  if (!response.ok) throw new Error(`GitHub API retornou ${response.status}.`);
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
