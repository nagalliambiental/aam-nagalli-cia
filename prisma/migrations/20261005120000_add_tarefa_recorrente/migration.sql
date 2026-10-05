-- CreateTable
CREATE TABLE "TarefaRecorrente" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "intervaloDias" INTEGER NOT NULL,
    "fimRecorrencia" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "visibilidade" TEXT NOT NULL DEFAULT 'publico',
    "responsavelPessoaId" INTEGER NOT NULL,
    "empreendimentoId" INTEGER,
    "processoId" INTEGER,
    "criadorUsuarioId" INTEGER,
    "ultimaTarefaId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarefaRecorrente_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Tarefa" ADD COLUMN "tarefaRecorrenteId" INTEGER;

-- CreateIndex
CREATE INDEX "TarefaRecorrente_ativo_idx" ON "TarefaRecorrente"("ativo");

-- CreateIndex
CREATE INDEX "Tarefa_tarefaRecorrenteId_idx" ON "Tarefa"("tarefaRecorrenteId");

-- AddForeignKey
ALTER TABLE "TarefaRecorrente" ADD CONSTRAINT "TarefaRecorrente_responsavelPessoaId_fkey" FOREIGN KEY ("responsavelPessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaRecorrente" ADD CONSTRAINT "TarefaRecorrente_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaRecorrente" ADD CONSTRAINT "TarefaRecorrente_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_tarefaRecorrenteId_fkey" FOREIGN KEY ("tarefaRecorrenteId") REFERENCES "TarefaRecorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
