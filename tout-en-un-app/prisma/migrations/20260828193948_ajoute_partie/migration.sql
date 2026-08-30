-- AlterTable
ALTER TABLE "chapitre" ADD COLUMN     "partie_id" BIGINT;

-- CreateTable
CREATE TABLE "partie" (
    "id" BIGSERIAL NOT NULL,
    "matiere_id" BIGINT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "icone" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "statut" "statut" NOT NULL DEFAULT 'brouillon',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMP(3),

    CONSTRAINT "partie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partie_matiere_id_statut_ordre_idx" ON "partie"("matiere_id", "statut", "ordre");

-- CreateIndex
CREATE INDEX "chapitre_partie_id_statut_ordre_idx" ON "chapitre"("partie_id", "statut", "ordre");

-- AddForeignKey
ALTER TABLE "partie" ADD CONSTRAINT "partie_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapitre" ADD CONSTRAINT "chapitre_partie_id_fkey" FOREIGN KEY ("partie_id") REFERENCES "partie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
