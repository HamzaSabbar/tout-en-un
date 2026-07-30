-- CreateEnum
CREATE TYPE "statut" AS ENUM ('brouillon', 'publie');

-- CreateEnum
CREATE TYPE "type_document" AS ENUM ('cours_pdf', 'resume_pdf', 'correction_pdf', 'sujet_pdf', 'support_live');

-- CreateTable
CREATE TABLE "filiere" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "filiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matiere" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "icone" TEXT,
    "couleur" TEXT,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filiere_matiere" (
    "id" BIGSERIAL NOT NULL,
    "filiere_id" BIGINT NOT NULL,
    "matiere_id" BIGINT NOT NULL,

    CONSTRAINT "filiere_matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapitre" (
    "id" BIGSERIAL NOT NULL,
    "matiere_id" BIGINT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "icone" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "chapitre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours" (
    "id" BIGSERIAL NOT NULL,
    "chapitre_id" BIGINT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "professeur_id" BIGINT,
    "publie_le" TIMESTAMP(3),
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "cours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video" (
    "id" BIGSERIAL NOT NULL,
    "cours_id" BIGINT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "duree_secondes" INTEGER,
    "fournisseur" TEXT NOT NULL,
    "video_ref" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichier" (
    "id" BIGSERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "cle_stockage" TEXT NOT NULL,
    "type_mime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "televerse_par" BIGINT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" BIGSERIAL NOT NULL,
    "type" "type_document" NOT NULL,
    "titre" TEXT NOT NULL,
    "matiere_id" BIGINT,
    "chapitre_id" BIGINT,
    "cours_id" BIGINT,
    "fichier_id" BIGINT NOT NULL,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "filiere_code_key" ON "filiere"("code");

-- CreateIndex
CREATE UNIQUE INDEX "matiere_code_key" ON "matiere"("code");

-- CreateIndex
CREATE UNIQUE INDEX "filiere_matiere_filiere_id_matiere_id_key" ON "filiere_matiere"("filiere_id", "matiere_id");

-- CreateIndex
CREATE INDEX "chapitre_matiere_id_statut_ordre_idx" ON "chapitre"("matiere_id", "statut", "ordre");

-- CreateIndex
CREATE INDEX "cours_chapitre_id_statut_ordre_idx" ON "cours"("chapitre_id", "statut", "ordre");

-- CreateIndex
CREATE INDEX "video_cours_id_statut_ordre_idx" ON "video"("cours_id", "statut", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "fichier_cle_stockage_key" ON "fichier"("cle_stockage");

-- AddForeignKey
ALTER TABLE "filiere_matiere" ADD CONSTRAINT "filiere_matiere_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filiere_matiere" ADD CONSTRAINT "filiere_matiere_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapitre" ADD CONSTRAINT "chapitre_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_chapitre_id_fkey" FOREIGN KEY ("chapitre_id") REFERENCES "chapitre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_professeur_id_fkey" FOREIGN KEY ("professeur_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video" ADD CONSTRAINT "video_cours_id_fkey" FOREIGN KEY ("cours_id") REFERENCES "cours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichier" ADD CONSTRAINT "fichier_televerse_par_fkey" FOREIGN KEY ("televerse_par") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_chapitre_id_fkey" FOREIGN KEY ("chapitre_id") REFERENCES "chapitre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_cours_id_fkey" FOREIGN KEY ("cours_id") REFERENCES "cours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_fichier_id_fkey" FOREIGN KEY ("fichier_id") REFERENCES "fichier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
