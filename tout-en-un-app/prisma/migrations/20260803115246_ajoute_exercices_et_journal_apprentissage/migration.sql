-- CreateEnum
CREATE TYPE "ressource_apprentissage" AS ENUM ('video', 'exercice', 'extrait', 'examen', 'test');

-- CreateEnum
CREATE TYPE "action_apprentissage" AS ENUM ('vue', 'terminee', 'aide_ouverte', 'correction_vue', 'reussi', 'a_refaire', 'test_valide');

-- AlterEnum
ALTER TYPE "type_document" ADD VALUE 'image_exercice';

-- CreateTable
CREATE TABLE "exercice" (
    "id" BIGSERIAL NOT NULL,
    "cours_id" BIGINT NOT NULL,
    "titre" TEXT NOT NULL,
    "enonce" JSONB NOT NULL,
    "aide" JSONB,
    "correction_texte" JSONB,
    "correction_video_ref" TEXT,
    "difficulte" INTEGER NOT NULL DEFAULT 3,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "exercice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenement_apprentissage" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "matiere_id" BIGINT NOT NULL,
    "chapitre_id" BIGINT,
    "cours_id" BIGINT,
    "ressource_type" "ressource_apprentissage" NOT NULL,
    "ressource_id" BIGINT NOT NULL,
    "action" "action_apprentissage" NOT NULL,
    "valeur" DECIMAL(6,2),
    "duree_secondes" INTEGER,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evenement_apprentissage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercice_cours_id_statut_ordre_idx" ON "exercice"("cours_id", "statut", "ordre");

-- CreateIndex
CREATE INDEX "evenement_apprentissage_utilisateur_id_cree_le_idx" ON "evenement_apprentissage"("utilisateur_id", "cree_le");

-- CreateIndex
CREATE INDEX "evenement_apprentissage_ressource_type_ressource_id_action_idx" ON "evenement_apprentissage"("ressource_type", "ressource_id", "action");

-- AddForeignKey
ALTER TABLE "exercice" ADD CONSTRAINT "exercice_cours_id_fkey" FOREIGN KEY ("cours_id") REFERENCES "cours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_apprentissage" ADD CONSTRAINT "evenement_apprentissage_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes ajoutées à la main : le langage de schéma Prisma ne sait pas
-- exprimer un CHECK, et il ignore ceux qu'il trouve en base, donc leur présence
-- ne sera pas signalée comme une dérive.
--
-- La difficulté est une note de 1 à 5 (architecture 9). Hors de cet intervalle
-- elle ne veut rien dire, et elle faussera silencieusement le classement des
-- révisions que le lot 7 en dérivera. Le schéma Zod valide déjà l'intervalle à
-- l'écriture ; cette contrainte est le filet qui tient même si une écriture
-- future contourne le service.
ALTER TABLE "exercice" ADD CONSTRAINT "exercice_difficulte_intervalle" CHECK ("difficulte" BETWEEN 1 AND 5);

-- Une durée négative n'existe pas. Le journal est immuable : une ligne fausse ne
-- se corrige pas, elle se contredit par une ligne suivante, donc mieux vaut
-- refuser l'écriture.
ALTER TABLE "evenement_apprentissage" ADD CONSTRAINT "evenement_apprentissage_duree_positive" CHECK ("duree_secondes" IS NULL OR "duree_secondes" >= 0);
