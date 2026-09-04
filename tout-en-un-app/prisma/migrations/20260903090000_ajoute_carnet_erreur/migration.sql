-- CreateTable
CREATE TABLE "carnet_erreur" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "exercice_id" BIGINT NOT NULL,
    "erreur" TEXT,
    "retenu" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carnet_erreur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carnet_erreur_utilisateur_id_cree_le_idx" ON "carnet_erreur"("utilisateur_id", "cree_le");

-- CreateIndex
CREATE UNIQUE INDEX "carnet_erreur_utilisateur_id_exercice_id_key" ON "carnet_erreur"("utilisateur_id", "exercice_id");

-- AddForeignKey
ALTER TABLE "carnet_erreur" ADD CONSTRAINT "carnet_erreur_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnet_erreur" ADD CONSTRAINT "carnet_erreur_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "exercice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
