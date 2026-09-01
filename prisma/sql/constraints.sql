-- =====================================================================
--  AAM — Constraints adicionais que o Prisma não expressa no schema
--  Aplicar após `prisma db push` / `prisma migrate deploy`.
--  Ex.: psql "$DATABASE_URL" -f prisma/sql/constraints.sql
--  (ou: npx prisma db execute --file prisma/sql/constraints.sql)
-- =====================================================================

-- Prazos recalcáveis: se a unidade NÃO for "fixa", quantidade deve existir.
ALTER TABLE "Prazo"
  DROP CONSTRAINT IF EXISTS prazo_quantidade_quando_nao_fixa;

ALTER TABLE "Prazo"
  ADD CONSTRAINT prazo_quantidade_quando_nao_fixa CHECK (
    "unidade" = 'fixa' OR "quantidade" IS NOT NULL
  );
