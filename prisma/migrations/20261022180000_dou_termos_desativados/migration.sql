-- Habilita a cura de termos do DOU: termos automáticos podem ser desativados.
ALTER TABLE "DouConfiguracao" ADD COLUMN "termosDesativados" TEXT;
