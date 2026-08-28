-- =====================================================================
--  AAM — Constraints adicionais que o Prisma não expressa no schema
--  Aplicar após `prisma db push` / `prisma migrate deploy`.
--  Ex.: psql "$DATABASE_URL" -f prisma/sql/constraints.sql
--  (ou: npx prisma db execute --file prisma/sql/constraints.sql)
-- =====================================================================

-- DocumentoVinculo: exige ao menos um alvo preenchido (não-duplica arquivo,
-- mas impede vínculo "vazio").
ALTER TABLE "DocumentoVinculo"
  DROP CONSTRAINT IF EXISTS documento_vinculo_ao_menos_um_alvo;

ALTER TABLE "DocumentoVinculo"
  ADD CONSTRAINT documento_vinculo_ao_menos_um_alvo CHECK (
    "processoId" IS NOT NULL OR
    "tituloId" IS NOT NULL OR
    "licencaId" IS NOT NULL OR
    "condicionanteId" IS NOT NULL OR
    "exigenciaId" IS NOT NULL OR
    "tarefaId" IS NOT NULL OR
    "areaId" IS NOT NULL OR
    "empreendimentoId" IS NOT NULL
  );

-- Prazos recalcáveis: se a unidade NÃO for "fixa", quantidade deve existir.
ALTER TABLE "Prazo"
  DROP CONSTRAINT IF EXISTS prazo_quantidade_quando_nao_fixa;

ALTER TABLE "Prazo"
  ADD CONSTRAINT prazo_quantidade_quando_nao_fixa CHECK (
    "unidade" = 'fixa' OR "quantidade" IS NOT NULL
  );
