-- CreateEnum
CREATE TYPE "session_examen" AS ENUM ('normale', 'rattrapage');

-- CreateTable
CREATE TABLE "extrait_national" (
    "id" BIGSERIAL NOT NULL,
    "matiere_id" BIGINT NOT NULL,
    "chapitre_id" BIGINT NOT NULL,
    "cours_id" BIGINT NOT NULL,
    "annee" INTEGER NOT NULL,
    "session" "session_examen" NOT NULL,
    "enonce" TEXT NOT NULL,
    "sujet_document_id" BIGINT,
    "correction_document_id" BIGINT,
    "correction_video_ref" TEXT,
    "duree_recommandee" INTEGER,
    "difficulte" INTEGER NOT NULL DEFAULT 3,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "extrait_national_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examen_national" (
    "id" BIGSERIAL NOT NULL,
    "matiere_id" BIGINT NOT NULL,
    "filiere_id" BIGINT NOT NULL,
    "annee" INTEGER NOT NULL,
    "session" "session_examen" NOT NULL,
    "sujet_document_id" BIGINT,
    "correction_document_id" BIGINT,
    "correction_video_ref" TEXT,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "examen_national_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extrait_national_sujet_document_id_key" ON "extrait_national"("sujet_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "extrait_national_correction_document_id_key" ON "extrait_national"("correction_document_id");

-- CreateIndex
CREATE INDEX "extrait_national_cours_id_statut_ordre_idx" ON "extrait_national"("cours_id", "statut", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "examen_national_sujet_document_id_key" ON "examen_national"("sujet_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "examen_national_correction_document_id_key" ON "examen_national"("correction_document_id");

-- CreateIndex
CREATE INDEX "examen_national_matiere_id_filiere_id_annee_idx" ON "examen_national"("matiere_id", "filiere_id", "annee");

-- CreateIndex
CREATE UNIQUE INDEX "examen_national_matiere_id_annee_session_key" ON "examen_national"("matiere_id", "annee", "session");

-- AddForeignKey
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_chapitre_id_fkey" FOREIGN KEY ("chapitre_id") REFERENCES "chapitre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_cours_id_fkey" FOREIGN KEY ("cours_id") REFERENCES "cours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_sujet_document_id_fkey" FOREIGN KEY ("sujet_document_id") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_correction_document_id_fkey" FOREIGN KEY ("correction_document_id") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_national" ADD CONSTRAINT "examen_national_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_national" ADD CONSTRAINT "examen_national_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_national" ADD CONSTRAINT "examen_national_sujet_document_id_fkey" FOREIGN KEY ("sujet_document_id") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_national" ADD CONSTRAINT "examen_national_correction_document_id_fkey" FOREIGN KEY ("correction_document_id") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraints à la main : Prisma ne sait pas les exprimer dans le
-- schéma. Même borne que exercice.difficulte pour extrait_national.difficulte.
-- Les bornes sur "annee" protègent contre une faute de frappe qui
-- corromprait le tri/filtre par année ; duree_recommandee suit le même motif
-- que evenement_apprentissage.duree_secondes.
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_difficulte_intervalle" CHECK ("difficulte" BETWEEN 1 AND 5);
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_annee_intervalle" CHECK ("annee" BETWEEN 2000 AND 2100);
ALTER TABLE "extrait_national" ADD CONSTRAINT "extrait_national_duree_positive" CHECK ("duree_recommandee" IS NULL OR "duree_recommandee" > 0);
ALTER TABLE "examen_national" ADD CONSTRAINT "examen_national_annee_intervalle" CHECK ("annee" BETWEEN 2000 AND 2100);
