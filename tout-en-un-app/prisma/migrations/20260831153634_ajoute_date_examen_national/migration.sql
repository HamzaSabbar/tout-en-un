-- CreateTable
CREATE TABLE "date_examen_national" (
    "id" BIGSERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "date_examen_national_pkey" PRIMARY KEY ("id")
);
