-- Ajout de `cree_le` aux tables de contenu, qui n'en avaient pas : sans elle,
-- aucune ligne n'est datable et un audit des données doit deviner.
--
-- En deux temps volontairement. `ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP`
-- renseigne aussi les lignes existantes, ce qui leur attribuerait l'heure de
-- cette migration comme date de création : une date fausse, et fausse de manière
-- crédible. La colonne est donc ajoutée sans défaut, les lignes antérieures
-- restant à NULL (« date inconnue »), puis le défaut est installé pour les
-- lignes à venir.
--
-- La colonne pourra passer en NOT NULL quand les lignes sans date auront été
-- traitées.

-- AlterTable
ALTER TABLE "chapitre" ADD COLUMN "cree_le" TIMESTAMP(3);
ALTER TABLE "chapitre" ALTER COLUMN "cree_le" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "cours" ADD COLUMN "cree_le" TIMESTAMP(3);
ALTER TABLE "cours" ALTER COLUMN "cree_le" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "filiere" ADD COLUMN "cree_le" TIMESTAMP(3);
ALTER TABLE "filiere" ALTER COLUMN "cree_le" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "matiere" ADD COLUMN "cree_le" TIMESTAMP(3);
ALTER TABLE "matiere" ALTER COLUMN "cree_le" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "offre" ADD COLUMN "cree_le" TIMESTAMP(3);
ALTER TABLE "offre" ALTER COLUMN "cree_le" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "video" ADD COLUMN "cree_le" TIMESTAMP(3);
ALTER TABLE "video" ALTER COLUMN "cree_le" SET DEFAULT CURRENT_TIMESTAMP;
