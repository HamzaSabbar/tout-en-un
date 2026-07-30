-- CreateEnum
CREATE TYPE "role" AS ENUM ('eleve', 'admin', 'professeur', 'support', 'commercial');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" BIGSERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "ville" TEXT,
    "mot_de_passe_hash" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'eleve',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniere_connexion" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_utilisateur" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" BIGINT NOT NULL,
    "jeton_hash" TEXT NOT NULL,
    "appareil" TEXT,
    "ip" TEXT,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "revoquee" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "session_utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_utilisateur_jeton_hash_key" ON "session_utilisateur"("jeton_hash");

-- CreateIndex
CREATE INDEX "session_utilisateur_utilisateur_id_idx" ON "session_utilisateur"("utilisateur_id");

-- AddForeignKey
ALTER TABLE "session_utilisateur" ADD CONSTRAINT "session_utilisateur_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
