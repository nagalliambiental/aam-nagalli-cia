UPDATE "BlocoExigenciaTemplate"
SET "ativo" = false
WHERE lower("nome") = 'cfem e pfm';

DELETE FROM "Prazo"
WHERE "exigenciaId" IN (
  SELECT e."id"
  FROM "Exigencia" e
  JOIN "Processo" p ON p."id" = e."processoId"
  WHERE p."numero" = '815.310/2008'
    AND e."descricao" IN ('CFEM: Pagamento mensal da CFEM', 'PFM: manutenção do Plano de Fechamento de Mina')
);

DELETE FROM "Exigencia"
WHERE "processoId" = (SELECT "id" FROM "Processo" WHERE "numero" = '815.310/2008' LIMIT 1)
  AND "descricao" IN ('CFEM: Pagamento mensal da CFEM', 'PFM: manutenção do Plano de Fechamento de Mina');
