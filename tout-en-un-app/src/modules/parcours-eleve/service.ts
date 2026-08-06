import { prisma } from "@/lib/db";

// Le catalogue de matières n'expose aucun contenu pédagogique. Chaque matière
// devient protégée dès que l'élève la choisit.
export async function listerMatieresPourEleve(utilisateurId: bigint) {
  const matieres = await prisma.matiere.findMany({
    where: {
      statut: "publie",
      supprime_le: null,
      filieres: { some: { filiere: { eleves: { some: { id: utilisateurId } } } } },
    },
    orderBy: [{ ordre: "asc" }, { libelle: "asc" }],
    select: {
      id: true,
      libelle: true,
      description: true,
      icone: true,
      couleur: true,
    },
  });
  return matieres.map((matiere) => ({ ...matiere, id: matiere.id.toString() }));
}

export async function obtenirPageMatierePubliee(matiereId: bigint) {
  const matiere = await prisma.matiere.findFirst({
    where: { id: matiereId, statut: "publie", supprime_le: null },
    select: {
      id: true,
      libelle: true,
      description: true,
      chapitres: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: { id: true, libelle: true, description: true },
      },
    },
  });
  if (!matiere) return null;
  return {
    ...matiere,
    id: matiere.id.toString(),
    chapitres: matiere.chapitres.map((chapitre) => ({
      ...chapitre,
      id: chapitre.id.toString(),
    })),
  };
}

export async function obtenirPageChapitrePubliee(
  matiereId: bigint,
  chapitreId: bigint,
) {
  const chapitre = await prisma.chapitre.findFirst({
    where: {
      id: chapitreId,
      matiere_id: matiereId,
      statut: "publie",
      supprime_le: null,
      matiere: { statut: "publie", supprime_le: null },
    },
    select: {
      id: true,
      libelle: true,
      description: true,
      matiere: { select: { id: true, libelle: true } },
      cours: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: { id: true, titre: true, description: true },
      },
    },
  });
  if (!chapitre) return null;
  return {
    ...chapitre,
    id: chapitre.id.toString(),
    matiere: { ...chapitre.matiere, id: chapitre.matiere.id.toString() },
    cours: chapitre.cours.map((cours) => ({ ...cours, id: cours.id.toString() })),
  };
}

export async function obtenirPageCoursPubliee(
  matiereId: bigint,
  chapitreId: bigint,
  coursId: bigint,
) {
  const cours = await prisma.cours.findFirst({
    where: {
      id: coursId,
      chapitre_id: chapitreId,
      statut: "publie",
      supprime_le: null,
      chapitre: {
        id: chapitreId,
        matiere_id: matiereId,
        statut: "publie",
        supprime_le: null,
        matiere: { statut: "publie", supprime_le: null },
      },
    },
    select: {
      id: true,
      titre: true,
      description: true,
      chapitre: {
        select: {
          id: true,
          libelle: true,
          matiere: { select: { id: true, libelle: true } },
        },
      },
      videos: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: {
          id: true,
          titre: true,
          description: true,
          duree_secondes: true,
        },
      },
      documents: {
        where: {
          statut: "publie",
          supprime_le: null,
          fichier: { supprime_le: null },
          // Une image d'exercice est un document par sa mécanique de stockage,
          // pas par son usage : elle s'affiche dans l'énoncé, elle n'a rien à
          // faire dans la liste des PDF à ouvrir.
          type: { not: "image_exercice" },
        },
        orderBy: { id: "asc" },
        select: { id: true, titre: true, type: true },
      },
      exercices: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        // Le contenu riche n'est pas sélectionné : la liste n'a besoin que des
        // libellés, et les énoncés complets traverseraient le cache pour rien.
        select: { id: true, titre: true, difficulte: true },
      },
    },
  });
  if (!cours) return null;
  return {
    ...cours,
    id: cours.id.toString(),
    chapitre: {
      ...cours.chapitre,
      id: cours.chapitre.id.toString(),
      matiere: {
        ...cours.chapitre.matiere,
        id: cours.chapitre.matiere.id.toString(),
      },
    },
    videos: cours.videos.map((video) => ({ ...video, id: video.id.toString() })),
    documents: cours.documents.map((document) => ({
      ...document,
      id: document.id.toString(),
    })),
    exercices: cours.exercices.map((exercice) => ({
      ...exercice,
      id: exercice.id.toString(),
    })),
  };
}
