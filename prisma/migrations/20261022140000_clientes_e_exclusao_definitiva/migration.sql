-- =====================================================================
-- Refinamentos de clientes/empreendimentos + exclusão definitiva
-- =====================================================================

-- 1) Novos campos ------------------------------------------------------------------

ALTER TABLE "Empresa" ADD COLUMN "complemento" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "bairro" TEXT;

ALTER TABLE "Empreendimento" ADD COLUMN "filial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Empreendimento" ADD COLUMN "cnpj" TEXT;

-- 2) Equipe de responsáveis da tarefa --------------------------------------------

CREATE TABLE "TarefaResponsavel" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaResponsavel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TarefaResponsavel_tarefaId_pessoaId_key" ON "TarefaResponsavel"("tarefaId", "pessoaId");
CREATE INDEX "TarefaResponsavel_pessoaId_idx" ON "TarefaResponsavel"("pessoaId");

ALTER TABLE "TarefaResponsavel" ADD CONSTRAINT "TarefaResponsavel_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TarefaResponsavel" ADD CONSTRAINT "TarefaResponsavel_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Exclusão definitiva em cascata ----------------------------------------------
-- Deletar uma Empresa/Empreendimento remove tudo que depende dela no banco.

ALTER TABLE "Empreendimento" DROP CONSTRAINT "Empreendimento_empresaPrincipalId_fkey";
ALTER TABLE "Empreendimento" ADD CONSTRAINT "Empreendimento_empresaPrincipalId_fkey" FOREIGN KEY ("empresaPrincipalId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Processo" DROP CONSTRAINT "Processo_empreendimentoId_fkey";
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Licenca" DROP CONSTRAINT "Licenca_empreendimentoId_fkey";
ALTER TABLE "Licenca" ADD CONSTRAINT "Licenca_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Tarefa" DROP CONSTRAINT "Tarefa_empreendimentoId_fkey";
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TarefaRecorrente" DROP CONSTRAINT "TarefaRecorrente_empreendimentoId_fkey";
ALTER TABLE "TarefaRecorrente" ADD CONSTRAINT "TarefaRecorrente_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TarefaRecorrente" DROP CONSTRAINT "TarefaRecorrente_processoId_fkey";
ALTER TABLE "TarefaRecorrente" ADD CONSTRAINT "TarefaRecorrente_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Fatura" DROP CONSTRAINT "Fatura_empresaId_fkey";
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Fatura" DROP CONSTRAINT "Fatura_empreendimentoId_fkey";
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) CNPJ/CPF únicos só entre cadastros não deletados ----------------------------
-- Registros soft-deleted não podem bloquear um novo cadastro.

DROP INDEX "Empresa_cnpj_key";
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj") WHERE "deletedAt" IS NULL;

DROP INDEX "Empresa_cpf_key";
CREATE UNIQUE INDEX "Empresa_cpf_key" ON "Empresa"("cpf") WHERE "deletedAt" IS NULL;
