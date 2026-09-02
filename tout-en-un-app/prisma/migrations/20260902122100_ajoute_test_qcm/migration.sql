-- CreateEnum
CREATE TYPE "type_question_test" AS ENUM ('qcm', 'vrai_faux', 'reponse_courte');

-- CreateTable
CREATE TABLE "test" (
    "id" BIGSERIAL NOT NULL,
    "cours_id" BIGINT NOT NULL,
    "titre" TEXT NOT NULL,
    "consigne" TEXT,
    "seuil_validation" INTEGER NOT NULL DEFAULT 50,
    "duree_minutes" INTEGER NOT NULL,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_test" (
    "id" BIGSERIAL NOT NULL,
    "test_id" BIGINT NOT NULL,
    "type" "type_question_test" NOT NULL DEFAULT 'qcm',
    "enonce" JSONB NOT NULL,
    "image_fichier_id" BIGINT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "explication" JSONB,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "question_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_reponse" (
    "id" BIGSERIAL NOT NULL,
    "question_test_id" BIGINT NOT NULL,
    "libelle" TEXT NOT NULL,
    "est_correcte" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "option_reponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentative_test" (
    "id" BIGSERIAL NOT NULL,
    "test_id" BIGINT NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "score" INTEGER,
    "score_max" INTEGER,
    "valide" BOOLEAN,
    "demarre_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termine_le" TIMESTAMP(3),

    CONSTRAINT "tentative_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponse_tentative" (
    "id" BIGSERIAL NOT NULL,
    "tentative_id" BIGINT NOT NULL,
    "question_test_id" BIGINT NOT NULL,
    "option_id" BIGINT,
    "correcte" BOOLEAN,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reponse_tentative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_cours_id_key" ON "test"("cours_id");

-- CreateIndex
CREATE INDEX "question_test_test_id_ordre_idx" ON "question_test"("test_id", "ordre");

-- CreateIndex
CREATE INDEX "option_reponse_question_test_id_ordre_idx" ON "option_reponse"("question_test_id", "ordre");

-- CreateIndex
CREATE INDEX "tentative_test_test_id_utilisateur_id_idx" ON "tentative_test"("test_id", "utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "reponse_tentative_tentative_id_question_test_id_key" ON "reponse_tentative"("tentative_id", "question_test_id");

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_cours_id_fkey" FOREIGN KEY ("cours_id") REFERENCES "cours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_test" ADD CONSTRAINT "question_test_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_reponse" ADD CONSTRAINT "option_reponse_question_test_id_fkey" FOREIGN KEY ("question_test_id") REFERENCES "question_test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentative_test" ADD CONSTRAINT "tentative_test_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentative_test" ADD CONSTRAINT "tentative_test_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_tentative" ADD CONSTRAINT "reponse_tentative_tentative_id_fkey" FOREIGN KEY ("tentative_id") REFERENCES "tentative_test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_tentative" ADD CONSTRAINT "reponse_tentative_question_test_id_fkey" FOREIGN KEY ("question_test_id") REFERENCES "question_test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints à la main : Prisma ne sait pas les exprimer dans le
-- schéma, et il ignore celles qu'il trouve en base (même motif que
-- exercice.difficulte, extrait_national.annee). "points" suit la même borne
-- que exercice.difficulte pour rester dans un ordre de grandeur raisonnable.
ALTER TABLE "test" ADD CONSTRAINT "test_seuil_validation_intervalle" CHECK ("seuil_validation" BETWEEN 0 AND 100);
ALTER TABLE "test" ADD CONSTRAINT "test_duree_minutes_positive" CHECK ("duree_minutes" > 0);
ALTER TABLE "question_test" ADD CONSTRAINT "question_test_points_positif" CHECK ("points" BETWEEN 1 AND 20);
ALTER TABLE "tentative_test" ADD CONSTRAINT "tentative_test_score_coherent" CHECK ("score" IS NULL OR "score_max" IS NULL OR "score" BETWEEN 0 AND "score_max");
