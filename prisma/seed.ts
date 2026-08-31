// =====================================================================
//  AAM — Seed inicial (catálogos + perfis + permissões)
//  Executar: npm run db:seed
// =====================================================================
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ------------------------------------------------------------------
  // ÓRGÃOS
  // ------------------------------------------------------------------
  const orgaos = [
    { nome: "Agência Nacional de Mineração", sigla: "ANM", nivel: "federal", ambito: "mineral" },
    { nome: "Instituto Água e Terra", sigla: "IAT", nivel: "estadual", ambito: "ambiental" },
    { nome: "Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis", sigla: "IBAMA", nivel: "federal", ambito: "ambiental" },
    { nome: "Prefeitura Municipal", sigla: "PREFEITURA", nivel: "municipal", ambito: "ambiental" },
  ];
  for (const o of orgaos) {
    await prisma.orgao.upsert({ where: { sigla: o.sigla }, update: {}, create: o });
  }

  // ------------------------------------------------------------------
  // TIPOS DE PROCESSO (tronco mineral | ambiental)
  // ------------------------------------------------------------------
  const tiposProcesso = [
    { nome: "Requerimento de Pesquisa", tronco: "mineral" },
    { nome: "Alvará de Pesquisa", tronco: "mineral" },
    { nome: "Relatório Final de Pesquisa", tronco: "mineral" },
    { nome: "Requerimento de Lavra", tronco: "mineral" },
    { nome: "Concessão de Lavra", tronco: "mineral" },
    { nome: "Licenciamento Ambiental", tronco: "ambiental" },
    { nome: "Renovação de Licença", tronco: "ambiental" },
    { nome: "Outro", tronco: "outro" },
  ];
  for (const t of tiposProcesso) {
    await prisma.tipoProcesso.upsert({ where: { nome: t.nome }, update: {}, create: t });
  }

  // ------------------------------------------------------------------
  // TIPOS DE EVENTO
  // ------------------------------------------------------------------
  const tiposEvento = [
    { nome: "Protocolo realizado", geraPrazo: false, geraTarefa: false },
    { nome: "Publicação", geraPrazo: false, geraTarefa: false },
    { nome: "Alvará emitido", geraPrazo: false, geraTarefa: false },
    { nome: "Relatório protocolado", geraPrazo: false, geraTarefa: true },
    { nome: "Relatório aprovado", geraPrazo: true, geraTarefa: true },
    { nome: "Exigência recebida", geraPrazo: true, geraTarefa: true },
    { nome: "Exigência respondida", geraPrazo: false, geraTarefa: false },
    { nome: "Licença emitida", geraPrazo: false, geraTarefa: false },
    { nome: "Licença renovada", geraPrazo: false, geraTarefa: false },
    { nome: "Decisão publicada", geraPrazo: false, geraTarefa: false },
    { nome: "Processo arquivado", geraPrazo: false, geraTarefa: false },
  ];
  for (const t of tiposEvento) {
    await prisma.tipoEvento.upsert({ where: { nome: t.nome }, update: {}, create: t });
  }

  // ------------------------------------------------------------------
  // TIPOS DE TÍTULO MINERÁRIO
  // ------------------------------------------------------------------
  const tiposTitulo = [
    { nome: "Requerimento de Pesquisa" },
    { nome: "Alvará de Pesquisa" },
    { nome: "Requerimento de Lavra" },
    { nome: "Concessão de Lavra" },
    { nome: "Outro" },
  ];
  for (const t of tiposTitulo) {
    await prisma.tipoTitulo.upsert({ where: { nome: t.nome }, update: {}, create: t });
  }

  // ------------------------------------------------------------------
  // TIPOS DE LICENÇA
  // ------------------------------------------------------------------
  const tiposLicenca = [
    { nome: "LP" }, { nome: "LI" }, { nome: "LO" }, { nome: "LAS" }, { nome: "Renovação" }, { nome: "Outro" },
  ];
  for (const t of tiposLicenca) {
    await prisma.tipoLicenca.upsert({ where: { nome: t.nome }, update: {}, create: t });
  }

  // ------------------------------------------------------------------
  // TIPOS DE RELAÇÃO ENTRE PROCESSOS
  // ------------------------------------------------------------------
  const tiposRelacao = [
    { nome: "origem" }, { nome: "deriva" }, { nome: "depende" }, { nome: "sucessor" },
    { nome: "predecessor" }, { nome: "relacionado" }, { nome: "vinculado" },
    { nome: "renovacao" }, { nome: "desdobramento" },
  ];
  for (const t of tiposRelacao) {
    await prisma.tipoRelacaoProcesso.upsert({ where: { nome: t.nome }, update: {}, create: t });
  }

  // ------------------------------------------------------------------
  // TIPOS DE ENTIDADE (auditoria) — marcados como sistema
  // ------------------------------------------------------------------
  const tiposEntidade = [
    "processo", "titulo", "licenca", "condicionante", "exigencia", "prazo",
    "tarefa", "documento", "empreendimento", "area", "empresa", "pessoa", "orgao",
    "comunicacao", "custo", "regra_prazo", "contrato", "integracao",
  ];
  for (const nome of tiposEntidade) {
    await prisma.tipoEntidade.upsert({ where: { nome }, update: {}, create: { nome, sistema: true } });
  }

  // ------------------------------------------------------------------
  // PERMISSÕES
  // ------------------------------------------------------------------
  const modulos = ["dashboard", "cadastro", "processo", "titulo", "licenca", "condicionante",
    "exigencia", "prazo", "tarefa", "documento", "comunicacao", "custo", "orgao", "relatorio", "usuario", "config", "automacao"];
  const acoes = ["ler", "criar", "editar", "excluir"];
  for (const m of modulos) {
    for (const a of acoes) {
      await prisma.permissao.upsert({
        where: { chave: `${m}:${a}` },
        update: {},
        create: { chave: `${m}:${a}`, modulo: m, acao: a, descricao: `${m} - ${a}` },
      });
    }
  }

  // ------------------------------------------------------------------
  // PERFIS INITIAIS: Administrador e Técnico
  // ------------------------------------------------------------------
  const adminPermissoes = await prisma.permissao.findMany();
  const admin = await prisma.perfil.upsert({
    where: { nome: "Administrador" },
    update: {},
    create: { nome: "Administrador", descricao: "Acesso total", sistema: true },
  });
  for (const p of adminPermissoes) {
    await prisma.perfilPermissao.upsert({
      where: { perfilId_permissaoId: { perfilId: admin.id, permissaoId: p.id } },
      update: {},
      create: { perfilId: admin.id, permissaoId: p.id },
    });
  }

  // Técnico: leitura/escrita nos módulos operacionais (sem usuário/config/excluir)
  const tecnico = await prisma.perfil.upsert({
    where: { nome: "Técnico" },
    update: {},
    create: { nome: "Técnico", descricao: "Operacional (executa tarefas e atualiza processos)" },
  });
  const moduloTecnico = ["processo", "titulo", "licenca", "condicionante", "exigencia", "prazo", "tarefa", "documento", "comunicacao", "custo", "cadastro"];
  const permissoesTecnico = await prisma.permissao.findMany({
    where: { modulo: { in: moduloTecnico }, acao: { in: ["ler", "criar", "editar"] } },
  });
  for (const p of permissoesTecnico) {
    await prisma.perfilPermissao.upsert({
      where: { perfilId_permissaoId: { perfilId: tecnico.id, permissaoId: p.id } },
      update: {},
      create: { perfilId: tecnico.id, permissaoId: p.id },
    });
  }

  // ------------------------------------------------------------------
  // USUÁRIO ADMIN INICIAL (opcional — descomente para criar)
  // ------------------------------------------------------------------
  // const senha = await bcrypt.hash("mudar123", 10);
  // await prisma.usuario.upsert({
  //   where: { email: "admin@aam.com.br" },
  //   update: {},
  //   create: { email: "admin@aam.com.br", senhaHash: senha, perfilId: admin.id },
  // });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
