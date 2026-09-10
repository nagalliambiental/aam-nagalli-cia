export type DouTermo = { text: string; origem: string; id?: number };

export function montarTermosDou(empresas: { id?: number; cnpj: string | null; cpf?: string | null; razaoSocial: string; nomeFantasia: string | null }[], empreendimentos: { id?: number; nome: string; apelido: string | null }[], processos: { id?: number; numero: string; nup: string | null }[], extras: string[] = []) {
  const termos: DouTermo[] = [];
  for (const empresa of empresas) {
    if (empresa.cnpj) termos.push({ text: empresa.cnpj.replace(/\D/g, ""), origem: "CNPJ do cliente", id: empresa.id });
    if (empresa.cpf) termos.push({ text: empresa.cpf.replace(/\D/g, ""), origem: "CPF do cliente", id: empresa.id });
    termos.push({ text: empresa.razaoSocial, origem: "Razão social", id: empresa.id });
    if (empresa.nomeFantasia) termos.push({ text: empresa.nomeFantasia, origem: "Nome fantasia", id: empresa.id });
  }
  for (const empreendimento of empreendimentos) {
    termos.push({ text: empreendimento.nome, origem: "Empreendimento", id: empreendimento.id });
  }
  for (const processo of processos) {
    if (processo.nup) termos.push({ text: processo.nup, origem: "NUP do processo", id: processo.id });
    termos.push({ text: processo.numero, origem: "Número do processo", id: processo.id });
  }
  for (const extra of extras) termos.push({ text: extra, origem: "Termo manual" });
  const seen = new Set<string>();
  return termos.filter((termo) => { const key = termo.text.trim().toLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
