ALTER TABLE "Empresa" ADD COLUMN "tipoPessoa" TEXT NOT NULL DEFAULT 'juridica';
ALTER TABLE "Empresa" ADD COLUMN "cpf" TEXT;
CREATE UNIQUE INDEX "Empresa_cpf_key" ON "Empresa"("cpf");
