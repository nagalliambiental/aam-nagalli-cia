-- CreateTable
CREATE TABLE "Comunicacao" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'email',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remetente" TEXT,
    "destinatario" TEXT,
    "processoId" INTEGER NOT NULL,
    "assunto" TEXT,
    "descricao" TEXT,
    "respostaEm" TIMESTAMP(3),
    "resposta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'enviada',
    "criadoPor" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comunicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Custo" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'outro',
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fornecedor" TEXT,
    "responsavelPessoaId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "observacoes" TEXT,
    "criadoPor" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Custo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comunicacao_processoId_data_idx" ON "Comunicacao"("processoId", "data");

-- CreateIndex
CREATE INDEX "Comunicacao_tipo_status_idx" ON "Comunicacao"("tipo", "status");

-- CreateIndex
CREATE INDEX "Comunicacao_data_idx" ON "Comunicacao"("data");

-- CreateIndex
CREATE INDEX "Custo_processoId_data_idx" ON "Custo"("processoId", "data");

-- CreateIndex
CREATE INDEX "Custo_tipo_status_idx" ON "Custo"("tipo", "status");

-- AddForeignKey
ALTER TABLE "Comunicacao" ADD CONSTRAINT "Comunicacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Custo" ADD CONSTRAINT "Custo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Custo" ADD CONSTRAINT "Custo_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
