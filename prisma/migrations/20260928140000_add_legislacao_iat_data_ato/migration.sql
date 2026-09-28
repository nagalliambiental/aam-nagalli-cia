-- AlterTable
ALTER TABLE "LegislacaoIat" ADD COLUMN     "dataAto" TIMESTAMP(3),
ADD COLUMN     "dataAtoConsultada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataAtoTentativas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dataPublicacao" TEXT;
