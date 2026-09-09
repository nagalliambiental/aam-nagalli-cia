CREATE TABLE "BackupArquivo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "arquivo" BYTEA NOT NULL,
    "criadoPor" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupArquivo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupArquivo_criadoEm_idx" ON "BackupArquivo"("criadoEm");
