CREATE TABLE "SeiProtocolo" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" TEXT,
    "dataInclusao" TEXT,
    "unidade" TEXT,
    "url" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeiProtocolo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeiProtocolo_processoId_numero_key" ON "SeiProtocolo"("processoId", "numero");
CREATE INDEX "SeiProtocolo_processoId_idx" ON "SeiProtocolo"("processoId");
ALTER TABLE "SeiProtocolo" ADD CONSTRAINT "SeiProtocolo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
