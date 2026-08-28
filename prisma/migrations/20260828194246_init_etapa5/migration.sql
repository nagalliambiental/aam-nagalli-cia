-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "inscricaoEstadual" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pessoa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "tipoPessoa" TEXT NOT NULL DEFAULT 'fisica',
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cep" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PessoaEmpresa" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'contato',
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PessoaEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "pessoaId" INTEGER,
    "perfilId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "termosAceitosEm" TIMESTAMP(3),
    "ultimoLoginEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permissao" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Permissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilPermissao" (
    "perfilId" INTEGER NOT NULL,
    "permissaoId" INTEGER NOT NULL,

    CONSTRAINT "PerfilPermissao_pkey" PRIMARY KEY ("perfilId","permissaoId")
);

-- CreateTable
CREATE TABLE "Orgao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "nivel" TEXT NOT NULL DEFAULT 'estadual',
    "ambito" TEXT NOT NULL DEFAULT 'ambiental',
    "site" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orgao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoProcesso" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tronco" TEXT NOT NULL DEFAULT 'mineral',
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoEvento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "geraPrazo" BOOLEAN NOT NULL DEFAULT false,
    "geraTarefa" BOOLEAN NOT NULL DEFAULT false,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoTitulo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoTitulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoLicenca" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoLicenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoRelacaoProcesso" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoRelacaoProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoEntidade" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TipoEntidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empreendimento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'pedreira',
    "municipio" TEXT,
    "uf" TEXT,
    "endereco" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacoes" TEXT,
    "empresaPrincipalId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empreendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpreendimentoEmpresa" (
    "id" SERIAL NOT NULL,
    "empreendimentoId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'operador',
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmpreendimentoEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'imovel',
    "matricula" TEXT,
    "areaHa" DOUBLE PRECISION,
    "municipio" TEXT,
    "uf" TEXT,
    "situacao" TEXT NOT NULL DEFAULT 'ativa',
    "coordenadas" TEXT,
    "poligono" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpreendimentoArea" (
    "id" SERIAL NOT NULL,
    "empreendimentoId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,
    "papel" TEXT DEFAULT 'compoe',

    CONSTRAINT "EmpreendimentoArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaEmpresa" (
    "id" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'proprietario',

    CONSTRAINT "AreaEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processo" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "orgaoId" INTEGER NOT NULL,
    "tipoProcessoId" INTEGER NOT NULL,
    "assunto" TEXT,
    "empreendimentoId" INTEGER,
    "fase" TEXT,
    "status" TEXT NOT NULL DEFAULT 'em_andamento',
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataEncerramento" TIMESTAMP(3),
    "descricao" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoEmpresa" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'cliente',

    CONSTRAINT "ProcessoEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaProcesso" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,
    "papel" TEXT DEFAULT 'relacionada',

    CONSTRAINT "AreaProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoRelacionamento" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "processoRelacionadoId" INTEGER NOT NULL,
    "tipoRelacaoId" INTEGER NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "ProcessoRelacionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoResponsavel" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'responsavel',
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProcessoResponsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TituloMinerario" (
    "id" SERIAL NOT NULL,
    "tipoTituloId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "orgaoId" INTEGER NOT NULL,
    "substancia" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "validade" TIMESTAMP(3),
    "situacao" TEXT NOT NULL DEFAULT 'ativo',
    "poligonalJson" TEXT,
    "observacoes" TEXT,
    "responsavelPessoaId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TituloMinerario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TituloEmpresa" (
    "id" SERIAL NOT NULL,
    "tituloId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'titular',

    CONSTRAINT "TituloEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaTitulo" (
    "id" SERIAL NOT NULL,
    "tituloId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "AreaTitulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TituloProcesso" (
    "id" SERIAL NOT NULL,
    "tituloId" INTEGER NOT NULL,
    "processoId" INTEGER NOT NULL,

    CONSTRAINT "TituloProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licenca" (
    "id" SERIAL NOT NULL,
    "tipoLicencaId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "orgaoId" INTEGER NOT NULL,
    "empreendimentoId" INTEGER,
    "dataEmissao" TIMESTAMP(3),
    "dataValidade" TIMESTAMP(3),
    "situacao" TEXT NOT NULL DEFAULT 'ativa',
    "observacoes" TEXT,
    "responsavelPessoaId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicencaEmpresa" (
    "id" SERIAL NOT NULL,
    "licencaId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'titular',

    CONSTRAINT "LicencaEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaLicenca" (
    "id" SERIAL NOT NULL,
    "licencaId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,
    "papel" TEXT DEFAULT 'abrangida',

    CONSTRAINT "AreaLicenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicencaProcesso" (
    "id" SERIAL NOT NULL,
    "licencaId" INTEGER NOT NULL,
    "processoId" INTEGER NOT NULL,

    CONSTRAINT "LicencaProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condicionante" (
    "id" SERIAL NOT NULL,
    "licencaId" INTEGER NOT NULL,
    "codigo" TEXT,
    "descricao" TEXT NOT NULL,
    "periodicidade" TEXT,
    "dataInicial" TIMESTAMP(3),
    "proximoVencimento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "observacoes" TEXT,
    "responsavelPessoaId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condicionante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exigencia" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "orgaoId" INTEGER NOT NULL,
    "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "prazoResposta" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "resposta" TEXT,
    "observacoes" TEXT,
    "responsavelPessoaId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exigencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "tipoEventoId" INTEGER NOT NULL,
    "processoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tituloId" INTEGER,
    "licencaId" INTEGER,
    "condicionanteId" INTEGER,
    "exigenciaId" INTEGER,
    "areaId" INTEGER,
    "criadoPor" INTEGER,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prazo" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "regraId" INTEGER,
    "eventoGeradorId" INTEGER,
    "tipo" TEXT,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'corridos',
    "quantidade" INTEGER,
    "dataInicial" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCalculadaOriginal" TIMESTAMP(3),
    "dataCalculadaAtual" TIMESTAMP(3),
    "dataEfetiva" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'futuro',
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "observacoes" TEXT,
    "tarefaId" INTEGER,
    "condicionanteId" INTEGER,
    "licencaId" INTEGER,
    "tituloId" INTEGER,
    "exigenciaId" INTEGER,
    "responsavelPessoaId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrazoMovimentacao" (
    "id" SERIAL NOT NULL,
    "prazoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "novaDataCalculada" TIMESTAMP(3),
    "motivo" TEXT,
    "usuarioId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrazoMovimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraPrazo" (
    "id" SERIAL NOT NULL,
    "orgaoId" INTEGER NOT NULL,
    "tipoProcessoId" INTEGER,
    "tipoEventoId" INTEGER,
    "tipoTituloId" INTEGER,
    "tipoLicencaId" INTEGER,
    "fase" TEXT,
    "condicao" TEXT,
    "quantidade" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'corridos',
    "dataFixa" TIMESTAMP(3),
    "acaoGerada" TEXT,
    "tarefaGerada" TEXT,
    "antecedenciaNotificacao" INTEGER,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraPrazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "prazoData" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" TIMESTAMP(3),
    "observacoes" TEXT,
    "responsavelPessoaId" INTEGER NOT NULL,
    "criadorUsuarioId" INTEGER,
    "processoId" INTEGER,
    "prazoId" INTEGER,
    "condicionanteId" INTEGER,
    "licencaId" INTEGER,
    "tituloMinerarioId" INTEGER,
    "exigenciaId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'in_app',
    "destinatarioPessoaId" INTEGER,
    "destinatarioUsuarioId" INTEGER,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processoId" INTEGER,
    "prazoId" INTEGER,
    "tarefaId" INTEGER,
    "licencaId" INTEGER,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'outro',
    "categoria" TEXT NOT NULL DEFAULT 'documento',
    "storageKey" TEXT NOT NULL,
    "mime" TEXT,
    "tamanho" INTEGER,
    "hash" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" TEXT NOT NULL DEFAULT 'upload',
    "classificacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacoes" TEXT,
    "responsavelPessoaId" INTEGER,
    "criadoPor" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoVinculo" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'anexo',
    "processoId" INTEGER,
    "tituloId" INTEGER,
    "licencaId" INTEGER,
    "condicionanteId" INTEGER,
    "exigenciaId" INTEGER,
    "tarefaId" INTEGER,
    "areaId" INTEGER,
    "empreendimentoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoVinculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrProcessamento" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "provedor" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "textoExtraido" TEXT,
    "camposJson" TEXT,
    "confianca" DOUBLE PRECISION,
    "erro" TEXT,
    "revistoPorUsuarioId" INTEGER,
    "revistoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrProcessamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "descricao" TEXT,
    "dataAssinatura" TIMESTAMP(3),
    "dataValidade" TIMESTAMP(3),
    "numero" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "empresaId" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Historico" (
    "id" SERIAL NOT NULL,
    "tipoEntidadeId" INTEGER NOT NULL,
    "entidadeId" BIGINT NOT NULL,
    "acao" TEXT NOT NULL,
    "campo" TEXT,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "usuarioId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Historico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE INDEX "Empresa_razaoSocial_idx" ON "Empresa"("razaoSocial");

-- CreateIndex
CREATE INDEX "Empresa_municipio_uf_idx" ON "Empresa"("municipio", "uf");

-- CreateIndex
CREATE INDEX "Pessoa_nome_idx" ON "Pessoa"("nome");

-- CreateIndex
CREATE INDEX "Pessoa_documento_idx" ON "Pessoa"("documento");

-- CreateIndex
CREATE INDEX "PessoaEmpresa_pessoaId_idx" ON "PessoaEmpresa"("pessoaId");

-- CreateIndex
CREATE UNIQUE INDEX "PessoaEmpresa_empresaId_pessoaId_papel_key" ON "PessoaEmpresa"("empresaId", "pessoaId", "papel");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_pessoaId_key" ON "Usuario"("pessoaId");

-- CreateIndex
CREATE INDEX "Usuario_perfilId_idx" ON "Usuario"("perfilId");

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_nome_key" ON "Perfil"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Permissao_chave_key" ON "Permissao"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "Orgao_sigla_key" ON "Orgao"("sigla");

-- CreateIndex
CREATE INDEX "Orgao_ambito_idx" ON "Orgao"("ambito");

-- CreateIndex
CREATE UNIQUE INDEX "TipoProcesso_nome_key" ON "TipoProcesso"("nome");

-- CreateIndex
CREATE INDEX "TipoProcesso_tronco_idx" ON "TipoProcesso"("tronco");

-- CreateIndex
CREATE UNIQUE INDEX "TipoEvento_nome_key" ON "TipoEvento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoTitulo_nome_key" ON "TipoTitulo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoLicenca_nome_key" ON "TipoLicenca"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoRelacaoProcesso_nome_key" ON "TipoRelacaoProcesso"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoEntidade_nome_key" ON "TipoEntidade"("nome");

-- CreateIndex
CREATE INDEX "Empreendimento_empresaPrincipalId_idx" ON "Empreendimento"("empresaPrincipalId");

-- CreateIndex
CREATE INDEX "Empreendimento_tipo_status_idx" ON "Empreendimento"("tipo", "status");

-- CreateIndex
CREATE INDEX "EmpreendimentoEmpresa_empresaId_idx" ON "EmpreendimentoEmpresa"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "EmpreendimentoEmpresa_empreendimentoId_empresaId_papel_key" ON "EmpreendimentoEmpresa"("empreendimentoId", "empresaId", "papel");

-- CreateIndex
CREATE INDEX "Area_municipio_uf_idx" ON "Area"("municipio", "uf");

-- CreateIndex
CREATE INDEX "EmpreendimentoArea_areaId_idx" ON "EmpreendimentoArea"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "EmpreendimentoArea_empreendimentoId_areaId_key" ON "EmpreendimentoArea"("empreendimentoId", "areaId");

-- CreateIndex
CREATE INDEX "AreaEmpresa_empresaId_idx" ON "AreaEmpresa"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaEmpresa_areaId_empresaId_papel_key" ON "AreaEmpresa"("areaId", "empresaId", "papel");

-- CreateIndex
CREATE INDEX "Processo_orgaoId_status_idx" ON "Processo"("orgaoId", "status");

-- CreateIndex
CREATE INDEX "Processo_tipoProcessoId_idx" ON "Processo"("tipoProcessoId");

-- CreateIndex
CREATE INDEX "Processo_empreendimentoId_idx" ON "Processo"("empreendimentoId");

-- CreateIndex
CREATE INDEX "Processo_dataAbertura_idx" ON "Processo"("dataAbertura");

-- CreateIndex
CREATE INDEX "ProcessoEmpresa_empresaId_idx" ON "ProcessoEmpresa"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessoEmpresa_processoId_empresaId_papel_key" ON "ProcessoEmpresa"("processoId", "empresaId", "papel");

-- CreateIndex
CREATE INDEX "AreaProcesso_areaId_idx" ON "AreaProcesso"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaProcesso_processoId_areaId_key" ON "AreaProcesso"("processoId", "areaId");

-- CreateIndex
CREATE INDEX "ProcessoRelacionamento_processoRelacionadoId_idx" ON "ProcessoRelacionamento"("processoRelacionadoId");

-- CreateIndex
CREATE INDEX "ProcessoRelacionamento_tipoRelacaoId_idx" ON "ProcessoRelacionamento"("tipoRelacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessoRelacionamento_processoId_processoRelacionadoId_tip_key" ON "ProcessoRelacionamento"("processoId", "processoRelacionadoId", "tipoRelacaoId");

-- CreateIndex
CREATE INDEX "ProcessoResponsavel_pessoaId_idx" ON "ProcessoResponsavel"("pessoaId");

-- CreateIndex
CREATE INDEX "ProcessoResponsavel_processoId_dataInicio_idx" ON "ProcessoResponsavel"("processoId", "dataInicio");

-- CreateIndex
CREATE INDEX "TituloMinerario_tipoTituloId_idx" ON "TituloMinerario"("tipoTituloId");

-- CreateIndex
CREATE INDEX "TituloMinerario_orgaoId_idx" ON "TituloMinerario"("orgaoId");

-- CreateIndex
CREATE INDEX "TituloMinerario_validade_idx" ON "TituloMinerario"("validade");

-- CreateIndex
CREATE INDEX "TituloEmpresa_empresaId_idx" ON "TituloEmpresa"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "TituloEmpresa_tituloId_empresaId_papel_key" ON "TituloEmpresa"("tituloId", "empresaId", "papel");

-- CreateIndex
CREATE INDEX "AreaTitulo_areaId_idx" ON "AreaTitulo"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaTitulo_tituloId_areaId_key" ON "AreaTitulo"("tituloId", "areaId");

-- CreateIndex
CREATE INDEX "TituloProcesso_processoId_idx" ON "TituloProcesso"("processoId");

-- CreateIndex
CREATE UNIQUE INDEX "TituloProcesso_tituloId_processoId_key" ON "TituloProcesso"("tituloId", "processoId");

-- CreateIndex
CREATE INDEX "Licenca_tipoLicencaId_idx" ON "Licenca"("tipoLicencaId");

-- CreateIndex
CREATE INDEX "Licenca_orgaoId_idx" ON "Licenca"("orgaoId");

-- CreateIndex
CREATE INDEX "Licenca_dataValidade_idx" ON "Licenca"("dataValidade");

-- CreateIndex
CREATE INDEX "LicencaEmpresa_empresaId_idx" ON "LicencaEmpresa"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "LicencaEmpresa_licencaId_empresaId_papel_key" ON "LicencaEmpresa"("licencaId", "empresaId", "papel");

-- CreateIndex
CREATE INDEX "AreaLicenca_areaId_idx" ON "AreaLicenca"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaLicenca_licencaId_areaId_key" ON "AreaLicenca"("licencaId", "areaId");

-- CreateIndex
CREATE INDEX "LicencaProcesso_processoId_idx" ON "LicencaProcesso"("processoId");

-- CreateIndex
CREATE UNIQUE INDEX "LicencaProcesso_licencaId_processoId_key" ON "LicencaProcesso"("licencaId", "processoId");

-- CreateIndex
CREATE INDEX "Condicionante_licencaId_idx" ON "Condicionante"("licencaId");

-- CreateIndex
CREATE INDEX "Condicionante_status_proximoVencimento_idx" ON "Condicionante"("status", "proximoVencimento");

-- CreateIndex
CREATE INDEX "Exigencia_processoId_idx" ON "Exigencia"("processoId");

-- CreateIndex
CREATE INDEX "Exigencia_orgaoId_status_idx" ON "Exigencia"("orgaoId", "status");

-- CreateIndex
CREATE INDEX "Evento_tipoEventoId_idx" ON "Evento"("tipoEventoId");

-- CreateIndex
CREATE INDEX "Evento_processoId_data_idx" ON "Evento"("processoId", "data");

-- CreateIndex
CREATE INDEX "Evento_tituloId_idx" ON "Evento"("tituloId");

-- CreateIndex
CREATE INDEX "Evento_licencaId_idx" ON "Evento"("licencaId");

-- CreateIndex
CREATE INDEX "Evento_exigenciaId_idx" ON "Evento"("exigenciaId");

-- CreateIndex
CREATE INDEX "Prazo_processoId_status_idx" ON "Prazo"("processoId", "status");

-- CreateIndex
CREATE INDEX "Prazo_status_dataCalculadaAtual_idx" ON "Prazo"("status", "dataCalculadaAtual");

-- CreateIndex
CREATE INDEX "Prazo_condicionanteId_idx" ON "Prazo"("condicionanteId");

-- CreateIndex
CREATE INDEX "Prazo_exigenciaId_idx" ON "Prazo"("exigenciaId");

-- CreateIndex
CREATE INDEX "PrazoMovimentacao_prazoId_data_idx" ON "PrazoMovimentacao"("prazoId", "data");

-- CreateIndex
CREATE INDEX "RegraPrazo_orgaoId_ativo_idx" ON "RegraPrazo"("orgaoId", "ativo");

-- CreateIndex
CREATE INDEX "Tarefa_responsavelPessoaId_status_idx" ON "Tarefa"("responsavelPessoaId", "status");

-- CreateIndex
CREATE INDEX "Tarefa_processoId_idx" ON "Tarefa"("processoId");

-- CreateIndex
CREATE INDEX "Tarefa_prazoData_status_idx" ON "Tarefa"("prazoData", "status");

-- CreateIndex
CREATE INDEX "Notificacao_destinatarioUsuarioId_lida_idx" ON "Notificacao"("destinatarioUsuarioId", "lida");

-- CreateIndex
CREATE INDEX "Notificacao_tipo_dataEnvio_idx" ON "Notificacao"("tipo", "dataEnvio");

-- CreateIndex
CREATE INDEX "Notificacao_prazoId_idx" ON "Notificacao"("prazoId");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_storageKey_key" ON "Documento"("storageKey");

-- CreateIndex
CREATE INDEX "Documento_storageKey_idx" ON "Documento"("storageKey");

-- CreateIndex
CREATE INDEX "Documento_tipo_status_idx" ON "Documento"("tipo", "status");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_documentoId_idx" ON "DocumentoVinculo"("documentoId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_processoId_idx" ON "DocumentoVinculo"("processoId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_tituloId_idx" ON "DocumentoVinculo"("tituloId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_licencaId_idx" ON "DocumentoVinculo"("licencaId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_condicionanteId_idx" ON "DocumentoVinculo"("condicionanteId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_exigenciaId_idx" ON "DocumentoVinculo"("exigenciaId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_tarefaId_idx" ON "DocumentoVinculo"("tarefaId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_areaId_idx" ON "DocumentoVinculo"("areaId");

-- CreateIndex
CREATE INDEX "DocumentoVinculo_empreendimentoId_idx" ON "DocumentoVinculo"("empreendimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoVinculo_documentoId_processoId_tituloId_licencaId__key" ON "DocumentoVinculo"("documentoId", "processoId", "tituloId", "licencaId", "condicionanteId", "exigenciaId", "tarefaId", "areaId", "empreendimentoId", "papel");

-- CreateIndex
CREATE INDEX "OcrProcessamento_documentoId_status_idx" ON "OcrProcessamento"("documentoId", "status");

-- CreateIndex
CREATE INDEX "Contrato_empresaId_idx" ON "Contrato"("empresaId");

-- CreateIndex
CREATE INDEX "Projeto_empresaId_idx" ON "Projeto"("empresaId");

-- CreateIndex
CREATE INDEX "Historico_tipoEntidadeId_entidadeId_idx" ON "Historico"("tipoEntidadeId", "entidadeId");

-- CreateIndex
CREATE INDEX "Historico_usuarioId_idx" ON "Historico"("usuarioId");

-- CreateIndex
CREATE INDEX "Historico_criadoEm_idx" ON "Historico"("criadoEm");

-- AddForeignKey
ALTER TABLE "PessoaEmpresa" ADD CONSTRAINT "PessoaEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PessoaEmpresa" ADD CONSTRAINT "PessoaEmpresa_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPermissao" ADD CONSTRAINT "PerfilPermissao_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPermissao" ADD CONSTRAINT "PerfilPermissao_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "Permissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empreendimento" ADD CONSTRAINT "Empreendimento_empresaPrincipalId_fkey" FOREIGN KEY ("empresaPrincipalId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpreendimentoEmpresa" ADD CONSTRAINT "EmpreendimentoEmpresa_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpreendimentoEmpresa" ADD CONSTRAINT "EmpreendimentoEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpreendimentoArea" ADD CONSTRAINT "EmpreendimentoArea_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpreendimentoArea" ADD CONSTRAINT "EmpreendimentoArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaEmpresa" ADD CONSTRAINT "AreaEmpresa_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaEmpresa" ADD CONSTRAINT "AreaEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_tipoProcessoId_fkey" FOREIGN KEY ("tipoProcessoId") REFERENCES "TipoProcesso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoEmpresa" ADD CONSTRAINT "ProcessoEmpresa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoEmpresa" ADD CONSTRAINT "ProcessoEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaProcesso" ADD CONSTRAINT "AreaProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaProcesso" ADD CONSTRAINT "AreaProcesso_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoRelacionamento" ADD CONSTRAINT "ProcessoRelacionamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoRelacionamento" ADD CONSTRAINT "ProcessoRelacionamento_processoRelacionadoId_fkey" FOREIGN KEY ("processoRelacionadoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoRelacionamento" ADD CONSTRAINT "ProcessoRelacionamento_tipoRelacaoId_fkey" FOREIGN KEY ("tipoRelacaoId") REFERENCES "TipoRelacaoProcesso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoResponsavel" ADD CONSTRAINT "ProcessoResponsavel_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoResponsavel" ADD CONSTRAINT "ProcessoResponsavel_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TituloMinerario" ADD CONSTRAINT "TituloMinerario_tipoTituloId_fkey" FOREIGN KEY ("tipoTituloId") REFERENCES "TipoTitulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TituloMinerario" ADD CONSTRAINT "TituloMinerario_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TituloMinerario" ADD CONSTRAINT "TituloMinerario_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TituloEmpresa" ADD CONSTRAINT "TituloEmpresa_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "TituloMinerario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TituloEmpresa" ADD CONSTRAINT "TituloEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaTitulo" ADD CONSTRAINT "AreaTitulo_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "TituloMinerario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaTitulo" ADD CONSTRAINT "AreaTitulo_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TituloProcesso" ADD CONSTRAINT "TituloProcesso_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "TituloMinerario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TituloProcesso" ADD CONSTRAINT "TituloProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licenca" ADD CONSTRAINT "Licenca_tipoLicencaId_fkey" FOREIGN KEY ("tipoLicencaId") REFERENCES "TipoLicenca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licenca" ADD CONSTRAINT "Licenca_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licenca" ADD CONSTRAINT "Licenca_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licenca" ADD CONSTRAINT "Licenca_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicencaEmpresa" ADD CONSTRAINT "LicencaEmpresa_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicencaEmpresa" ADD CONSTRAINT "LicencaEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaLicenca" ADD CONSTRAINT "AreaLicenca_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaLicenca" ADD CONSTRAINT "AreaLicenca_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicencaProcesso" ADD CONSTRAINT "LicencaProcesso_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicencaProcesso" ADD CONSTRAINT "LicencaProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condicionante" ADD CONSTRAINT "Condicionante_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condicionante" ADD CONSTRAINT "Condicionante_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exigencia" ADD CONSTRAINT "Exigencia_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exigencia" ADD CONSTRAINT "Exigencia_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exigencia" ADD CONSTRAINT "Exigencia_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_tipoEventoId_fkey" FOREIGN KEY ("tipoEventoId") REFERENCES "TipoEvento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "TituloMinerario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_condicionanteId_fkey" FOREIGN KEY ("condicionanteId") REFERENCES "Condicionante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_exigenciaId_fkey" FOREIGN KEY ("exigenciaId") REFERENCES "Exigencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "RegraPrazo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_eventoGeradorId_fkey" FOREIGN KEY ("eventoGeradorId") REFERENCES "Evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_condicionanteId_fkey" FOREIGN KEY ("condicionanteId") REFERENCES "Condicionante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "TituloMinerario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_exigenciaId_fkey" FOREIGN KEY ("exigenciaId") REFERENCES "Exigencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrazoMovimentacao" ADD CONSTRAINT "PrazoMovimentacao_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrazoMovimentacao" ADD CONSTRAINT "PrazoMovimentacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraPrazo" ADD CONSTRAINT "RegraPrazo_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraPrazo" ADD CONSTRAINT "RegraPrazo_tipoProcessoId_fkey" FOREIGN KEY ("tipoProcessoId") REFERENCES "TipoProcesso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraPrazo" ADD CONSTRAINT "RegraPrazo_tipoEventoId_fkey" FOREIGN KEY ("tipoEventoId") REFERENCES "TipoEvento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraPrazo" ADD CONSTRAINT "RegraPrazo_tipoTituloId_fkey" FOREIGN KEY ("tipoTituloId") REFERENCES "TipoTitulo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraPrazo" ADD CONSTRAINT "RegraPrazo_tipoLicencaId_fkey" FOREIGN KEY ("tipoLicencaId") REFERENCES "TipoLicenca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_criadorUsuarioId_fkey" FOREIGN KEY ("criadorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_condicionanteId_fkey" FOREIGN KEY ("condicionanteId") REFERENCES "Condicionante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_tituloMinerarioId_fkey" FOREIGN KEY ("tituloMinerarioId") REFERENCES "TituloMinerario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_exigenciaId_fkey" FOREIGN KEY ("exigenciaId") REFERENCES "Exigencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_destinatarioUsuarioId_fkey" FOREIGN KEY ("destinatarioUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "TituloMinerario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "Licenca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_condicionanteId_fkey" FOREIGN KEY ("condicionanteId") REFERENCES "Condicionante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_exigenciaId_fkey" FOREIGN KEY ("exigenciaId") REFERENCES "Exigencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculo" ADD CONSTRAINT "DocumentoVinculo_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrProcessamento" ADD CONSTRAINT "OcrProcessamento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrProcessamento" ADD CONSTRAINT "OcrProcessamento_revistoPorUsuarioId_fkey" FOREIGN KEY ("revistoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historico" ADD CONSTRAINT "Historico_tipoEntidadeId_fkey" FOREIGN KEY ("tipoEntidadeId") REFERENCES "TipoEntidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historico" ADD CONSTRAINT "Historico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
