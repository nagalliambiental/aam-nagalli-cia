ALTER TABLE "Notificacao"
ADD COLUMN "dataEvento" TIMESTAMP(3);

UPDATE "Notificacao"
SET "lida" = true
WHERE "tipo" = 'sei_protocolo' AND "dataEvento" IS NULL;
