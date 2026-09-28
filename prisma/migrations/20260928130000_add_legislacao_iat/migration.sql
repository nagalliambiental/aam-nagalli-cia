-- CreateTable
CREATE TABLE "LegislacaoIat" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "ementa" TEXT NOT NULL,
    "url" TEXT,
    "anexosUrl" TEXT,
    "situacao" TEXT NOT NULL DEFAULT 'vigente',
    "revogadaPor" TEXT,
    "hash" TEXT NOT NULL,
    "fonteUrl" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "ultimaVerificacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegislacaoIat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegislacaoIat_situacao_ano_idx" ON "LegislacaoIat"("situacao", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "LegislacaoIat_tipo_numero_ano_key" ON "LegislacaoIat"("tipo", "numero", "ano");
