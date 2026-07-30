-- CreateTable
CREATE TABLE "jeton_reinitialisation" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "jeton_hash" TEXT NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "utilise_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jeton_reinitialisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jeton_reinitialisation_jeton_hash_key" ON "jeton_reinitialisation"("jeton_hash");

-- CreateIndex
CREATE INDEX "jeton_reinitialisation_utilisateur_id_idx" ON "jeton_reinitialisation"("utilisateur_id");

-- AddForeignKey
ALTER TABLE "jeton_reinitialisation" ADD CONSTRAINT "jeton_reinitialisation_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
