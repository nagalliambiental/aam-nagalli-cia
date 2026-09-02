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
    // Regime mais comum: Autorização de Pesquisa -> Concessão de Lavra (ANM)
    { nome: "Requerimento de Pesquisa", tronco: "mineral", descricao: "Fase inicial - requerimento protocolado na ANM" },
    { nome: "Autorização de Pesquisa", tronco: "mineral", descricao: "Alvará de Pesquisa vigente (1 a 4 anos)" },
    { nome: "Direito de Requerer a Lavra", tronco: "mineral", descricao: "RFP aprovado - 1 ano para requerer lavra" },
    { nome: "Requerimento de Lavra", tronco: "mineral", descricao: "Com PAE e licenciamento em análise" },
    { nome: "Concessão de Lavra", tronco: "mineral", descricao: "Portaria de Lavra - título definitivo" },
    // Outras fases / regimes mantidos para compatibilidade
    { nome: "Alvará de Pesquisa", tronco: "mineral" },
    { nome: "Relatório Final de Pesquisa", tronco: "mineral" },
    { nome: "Licenciamento Ambiental", tronco: "ambiental" },
    { nome: "Renovação de Licença", tronco: "ambiental" },
    { nome: "Outro", tronco: "outro" },
  ];
  for (const t of tiposProcesso) {
    await prisma.tipoProcesso.upsert({
      where: { nome: t.nome },
      update: { descricao: (t as { descricao?: string }).descricao ?? undefined, tronco: t.tronco },
      create: t as never,
    });
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
  // BLOCOS DE EXIGÊNCIA POR FASE (regime Autorização -> Concessão)
  // ------------------------------------------------------------------
  const blocosPorFase: Record<string, { nome: string; descricao: string; prazoDias: number }[]> = {
    "Requerimento de Pesquisa": [
      { nome: "Protocolo REPEM", descricao: "Preenchimento e protocolo do requerimento no REPEM com plano de pesquisa e ART", prazoDias: 30 },
      { nome: "Emolumentos e documentação", descricao: "Pagamento de emolumentos e juntada de documentos de titularidade", prazoDias: 15 },
    ],
    "Autorização de Pesquisa": [
      { nome: "Comunicação de início de pesquisa", descricao: "Comunicar à ANM o início dos trabalhos em até 60 dias após DOU do Alvará", prazoDias: 60 },
      { nome: "TAH e DIPEM anual", descricao: "Pagamento da TAH por hectare e entrega da DIPEM anualmente", prazoDias: 365 },
      { nome: "Relatório Parcial (se prorrogação)", descricao: "Apresentar RPP justificando prorrogação com 60 dias de antecedência", prazoDias: 60 },
    ],
    "Direito de Requerer a Lavra": [
      { nome: "Relatório Final de Pesquisa (RFP)", descricao: "Apresentar RFP detalhando resultados e viabilidade econômica", prazoDias: 30 },
      { nome: "Requerimento de Lavra (1 ano)", descricao: "Protocolar requerimento de lavra com PAE no prazo de 1 ano após aprovação do RFP", prazoDias: 365 },
    ],
    "Requerimento de Lavra": [
      { nome: "PAE e documentação técnica", descricao: "Plano de Aproveitamento Econômico, ART, e documentos técnicos", prazoDias: 60 },
      { nome: "Licenciamento ambiental", descricao: "LP/LI/LO e comprovação de protocolo no órgão ambiental (60 dias)", prazoDias: 60 },
    ],
    "Concessão de Lavra": [
      { nome: "RAL anual", descricao: "Relatório Anual de Lavra - entrega anual obrigatória", prazoDias: 365 },
      { nome: "CFEM e PFM", descricao: "Pagamento mensal da CFEM e manutenção do Plano de Fechamento de Mina", prazoDias: 30 },
    ],
  };
  for (const [fase, blocos] of Object.entries(blocosPorFase)) {
    for (let i = 0; i < blocos.length; i++) {
      const b = blocos[i];
      const exists = await prisma.blocoExigenciaTemplate.findFirst({ where: { fase, nome: b.nome } });
      if (!exists) {
        await prisma.blocoExigenciaTemplate.create({ data: { fase, nome: b.nome, descricao: b.descricao, prazoDias: b.prazoDias, ordem: i } });
      }
    }
  }

  // ------------------------------------------------------------------
  // TIPOS DE ENTIDADE (auditoria) — marcados como sistema
  // ------------------------------------------------------------------
  const tiposEntidade = [
    "processo", "titulo", "licenca", "condicionante", "exigencia", "prazo",
    "tarefa", "documento", "empreendimento", "area", "empresa", "pessoa", "orgao",
    "comunicacao", "custo", "regra_prazo", "bloco_exigencia", "contrato", "integracao", "usuario", "perfil",
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

    // PERFIS: Administrador (total), Técnico Chefe (gestor operacional),
  // Técnico (execução). Define o conjunto exato de permissões de cada um.
  const chaves = (modulos: string[], acoes: string[]) => modulos.flatMap((m) => acoes.map((a) => `${m}:${a}`));

  async function definirPermissoes(perfilId: number, chavesList: string[]) {
    await prisma.perfilPermissao.deleteMany({ where: { perfilId } });
    for (const chave of chavesList) {
      const perm = await prisma.permissao.findUnique({ where: { chave } });
      if (perm) await prisma.perfilPermissao.create({ data: { perfilId, permissaoId: perm.id } });
    }
  }

  const OP = ['processo','titulo','licenca','condicionante','exigencia','prazo','tarefa','documento','comunicacao','custo','cadastro'];
  const SO_LEITURA = ['relatorio','orgao','dashboard'];

  // Administrador: tudo
  const adminPermissoes = await prisma.permissao.findMany();
  const admin = await prisma.perfil.upsert({
    where: { nome: 'Administrador' },
    update: {},
    create: { nome: 'Administrador', descricao: 'Acesso total e administração do sistema', sistema: true },
  });
  await definirPermissoes(admin.id, adminPermissoes.map((pp) => pp.chave));

  // Técnico Chefe: gestor operacional — opera tudo, sem segurança/exclusão
  const chefe = await prisma.perfil.upsert({
    where: { nome: 'Técnico Chefe' },
    update: {},
    create: { nome: 'Técnico Chefe', descricao: 'Gestor operacional (supervisão dos processos e da equipe)', sistema: true },
  });
  const chefeChaves = [ ...chaves(OP, ['ler','criar','editar']), ...chaves(SO_LEITURA, ['ler']) ];
  await definirPermissoes(chefe.id, chefeChaves);

  // Técnico: execução — atualiza operação, sem cadastro sensível e sem excluir/segurança
  const tecnico = await prisma.perfil.upsert({
    where: { nome: 'Técnico' },
    update: {},
    create: { nome: 'Técnico', descricao: 'Execução operacional (atualiza processos, tarefas, prazos e documentos)', sistema: true },
  });
  const OP_EDICAO = OP.filter((m) => m !== 'cadastro');
  const tecnicoChaves = [ ...chaves(OP, ['ler']), ...chaves(OP_EDICAO, ['criar','editar']), ...chaves(SO_LEITURA, ['ler']) ];
  await definirPermissoes(tecnico.id, tecnicoChaves);

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
