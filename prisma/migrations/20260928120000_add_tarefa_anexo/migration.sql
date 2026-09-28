-- CreateTable
CREATE TABLE "TarefaAnexo" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "tamanho" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "criadoPor" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TarefaAnexo_tarefaId_idx" ON "TarefaAnexo"("tarefaId");

-- AddForeignKey
ALTER TABLE "TarefaAnexo" ADD CONSTRAINT "TarefaAnexo_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
