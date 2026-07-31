-- CreateEnum
CREATE TYPE "statut_abonnement" AS ENUM ('en_attente', 'actif', 'expire', 'annule');

-- CreateEnum
CREATE TYPE "statut_paiement" AS ENUM ('en_attente', 'paye');

-- CreateEnum
CREATE TYPE "statut_demande" AS ENUM ('en_attente', 'traitee', 'refusee');

-- AlterTable
ALTER TABLE "utilisateur" ADD COLUMN     "filiere_id" BIGINT;

-- CreateTable
CREATE TABLE "offre" (
    "id" BIGSERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "duree_jours" INTEGER NOT NULL,
    "nb_matieres" INTEGER NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "offre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnement" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "offre_id" BIGINT NOT NULL,
    "date_debut" TIMESTAMP(3),
    "date_fin" TIMESTAMP(3),
    "statut" "statut_abonnement" NOT NULL DEFAULT 'en_attente',
    "montant" DECIMAL(10,2) NOT NULL,
    "paiement_statut" "statut_paiement" NOT NULL DEFAULT 'en_attente',
    "reference_paiement" TEXT,
    "note_admin" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnement_matiere" (
    "id" BIGSERIAL NOT NULL,
    "abonnement_id" BIGINT NOT NULL,
    "matiere_id" BIGINT NOT NULL,
    "date_activation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_expiration" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnement_matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_matiere" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "matiere_id" BIGINT NOT NULL,
    "abonnement_id" BIGINT NOT NULL,
    "statut" "statut_demande" NOT NULL DEFAULT 'en_attente',
    "message" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite_le" TIMESTAMP(3),
    "traite_par" BIGINT,

    CONSTRAINT "demande_matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_admin" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entite_id" BIGINT NOT NULL,
    "avant" JSONB,
    "apres" JSONB,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abonnement_utilisateur_id_statut_idx" ON "abonnement"("utilisateur_id", "statut");

-- CreateIndex
CREATE INDEX "abonnement_matiere_matiere_id_date_expiration_idx" ON "abonnement_matiere"("matiere_id", "date_expiration");

-- CreateIndex
CREATE UNIQUE INDEX "abonnement_matiere_abonnement_id_matiere_id_key" ON "abonnement_matiere"("abonnement_id", "matiere_id");

-- CreateIndex
CREATE INDEX "demande_matiere_statut_cree_le_idx" ON "demande_matiere"("statut", "cree_le");

-- CreateIndex
CREATE INDEX "journal_admin_entite_entite_id_idx" ON "journal_admin"("entite", "entite_id");

-- CreateIndex
CREATE INDEX "journal_admin_utilisateur_id_cree_le_idx" ON "journal_admin"("utilisateur_id", "cree_le");

-- CreateIndex
CREATE INDEX "utilisateur_filiere_id_idx" ON "utilisateur"("filiere_id");

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement" ADD CONSTRAINT "abonnement_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement" ADD CONSTRAINT "abonnement_offre_id_fkey" FOREIGN KEY ("offre_id") REFERENCES "offre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement_matiere" ADD CONSTRAINT "abonnement_matiere_abonnement_id_fkey" FOREIGN KEY ("abonnement_id") REFERENCES "abonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement_matiere" ADD CONSTRAINT "abonnement_matiere_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_matiere" ADD CONSTRAINT "demande_matiere_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_matiere" ADD CONSTRAINT "demande_matiere_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_matiere" ADD CONSTRAINT "demande_matiere_abonnement_id_fkey" FOREIGN KEY ("abonnement_id") REFERENCES "abonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_matiere" ADD CONSTRAINT "demande_matiere_traite_par_fkey" FOREIGN KEY ("traite_par") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_admin" ADD CONSTRAINT "journal_admin_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
