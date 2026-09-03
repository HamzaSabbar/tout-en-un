-- CreateEnum
CREATE TYPE "categorie_exercice" AS ENUM ('comprehension', 'type_bac', 'approfondissement');

-- AlterTable
ALTER TABLE "exercice" ADD COLUMN "categorie" "categorie_exercice" NOT NULL DEFAULT 'comprehension';

-- Répartit les exercices déjà notés sur l'ancienne échelle 1..5 selon le même
-- seuillage que l'ex-badge Facile/Moyen/Difficile (indicateur-difficulte.tsx :
-- seuil 2 -> Facile, seuil 3 -> Moyen, seuil 5 -> Difficile), pour ne pas
-- reclasser silencieusement tout le contenu existant en "comprehension".
UPDATE "exercice" SET "categorie" = CASE
    WHEN "difficulte" <= 2 THEN 'comprehension'
    WHEN "difficulte" = 3 THEN 'type_bac'
    ELSE 'approfondissement'
END::"categorie_exercice";

-- AlterTable
-- Emporte avec elle la contrainte CHECK "exercice_difficulte_intervalle"
-- (PostgreSQL la retire automatiquement avec la colonne qu'elle borne).
ALTER TABLE "exercice" DROP COLUMN "difficulte";
