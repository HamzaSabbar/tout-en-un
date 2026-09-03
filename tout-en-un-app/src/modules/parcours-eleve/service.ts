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
      _count: { select: { chapitres: { where: { statut: "publie", supprime_le: null } } } },
    },
  });
  return matieres.map((matiere) => ({
    id: matiere.id.toString(),
    libelle: matiere.libelle,
    description: matiere.description,
    icone: matiere.icone,
    couleur: matiere.couleur,
    nbChapitres: matiere._count.chapitres,
  }));
}

// Un chapitre n'a pas de relation directe vers `exercice` (elle passe par
// `cours`), donc pas de `_count` en un seul champ pour les exercices : on
// inclut le compte d'exercices de chaque cours et on les additionne
// ci-dessous. Toujours une seule requête, aucune boucle de requêtes.
const SELECT_CHAPITRE_CARTE = {
  id: true,
  libelle: true,
  description: true,
  _count: { select: { cours: { where: { statut: "publie", supprime_le: null } } } },
  cours: {
    where: { statut: "publie", supprime_le: null },
    select: {
      _count: { select: { exercices: { where: { statut: "publie", supprime_le: null } } } },
    },
  },
} as const;

interface ChapitreSelectionne {
  id: bigint;
  libelle: string;
  description: string | null;
  _count: { cours: number };
  cours: { _count: { exercices: number } }[];
}

function mapperChapitreCarte(chapitre: ChapitreSelectionne) {
  return {
    id: chapitre.id.toString(),
    libelle: chapitre.libelle,
    description: chapitre.description,
    nbCours: chapitre._count.cours,
    nbExercices: chapitre.cours.reduce((total, cours) => total + cours._count.exercices, 0),
  };
}

// Certaines matières (Physique-Chimie) regroupent leurs chapitres par partie
// (Physique / Chimie) ; d'autres (Mathématiques) n'en ont aucune. `parties`
// vaut alors `[]` et `chapitresSansPartie` est exactement la liste plate
// d'origine : aucun cas particulier requis côté page pour ce chemin.
export async function obtenirPageMatierePubliee(matiereId: bigint) {
  const matiere = await prisma.matiere.findFirst({
    where: { id: matiereId, statut: "publie", supprime_le: null },
    select: {
      id: true,
      libelle: true,
      description: true,
      parties: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: {
          id: true,
          libelle: true,
          chapitres: {
            where: { statut: "publie", supprime_le: null },
            orderBy: [{ ordre: "asc" }, { id: "asc" }],
            select: SELECT_CHAPITRE_CARTE,
          },
        },
      },
      chapitres: {
        where: { statut: "publie", supprime_le: null, partie_id: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: SELECT_CHAPITRE_CARTE,
      },
    },
  });
  if (!matiere) return null;
  return {
    id: matiere.id.toString(),
    libelle: matiere.libelle,
    description: matiere.description,
    parties: matiere.parties.map((partie) => ({
      id: partie.id.toString(),
      libelle: partie.libelle,
      chapitres: partie.chapitres.map(mapperChapitreCarte),
    })),
    chapitresSansPartie: matiere.chapitres.map(mapperChapitreCarte),
  };
}

// Une partie (Physique / Chimie) est son propre écran de choix côté élève :
// même garde que `obtenirPageChapitrePubliee` (matière publiée, partie elle-
// même publiée et appartenant bien à `matiereId`), même carte de chapitre que
// la page matière (`SELECT_CHAPITRE_CARTE`/`mapperChapitreCarte`).
export async function obtenirPagePartiePubliee(matiereId: bigint, partieId: bigint) {
  const partie = await prisma.partie.findFirst({
    where: {
      id: partieId,
      matiere_id: matiereId,
      statut: "publie",
      supprime_le: null,
      matiere: { statut: "publie", supprime_le: null },
    },
    select: {
      id: true,
      libelle: true,
      matiere: { select: { id: true, libelle: true } },
      chapitres: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: SELECT_CHAPITRE_CARTE,
      },
    },
  });
  if (!partie) return null;
  return {
    id: partie.id.toString(),
    libelle: partie.libelle,
    matiere: { id: partie.matiere.id.toString(), libelle: partie.matiere.libelle },
    chapitres: partie.chapitres.map(mapperChapitreCarte),
  };
}

// Dernier cours de cette matière dans lequel l'élève a franchi une étape
// d'exercice. Dérivé du journal existant, sans nouvelle colonne : `cours_id`
// est déjà renseigné sur chaque événement d'exercice. Limite honnête à
// documenter au rendu — une visite qui ne touche qu'une vidéo n'écrit rien
// aujourd'hui, donc « reprendre » peut rester silencieux pour un élève qui a
// seulement regardé une vidéo sans ouvrir d'exercice.
export async function obtenirReprisePourMatiere(utilisateurId: bigint, matiereId: bigint) {
  const evenement = await prisma.evenementApprentissage.findFirst({
    where: { utilisateur_id: utilisateurId, matiere_id: matiereId, cours_id: { not: null } },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
    select: { cours_id: true, chapitre_id: true },
  });
  if (!evenement?.cours_id || !evenement.chapitre_id) return null;

  const cours = await prisma.cours.findFirst({
    where: { id: evenement.cours_id, statut: "publie", supprime_le: null },
    select: { id: true, titre: true },
  });
  if (!cours) return null;

  return {
    coursId: cours.id.toString(),
    chapitreId: evenement.chapitre_id.toString(),
    titre: cours.titre,
  };
}

// Dernier cours vu par l'élève, toutes matières confondues : source de la
// carte « Reprendre mon apprentissage » du tableau de bord. Même dérivation
// et même limite honnête que `obtenirReprisePourMatiere` (rien n'est écrit
// pour une simple lecture vidéo aujourd'hui), simplement sans filtre matière.
export async function obtenirRepriseGlobale(utilisateurId: bigint) {
  const evenement = await prisma.evenementApprentissage.findFirst({
    where: { utilisateur_id: utilisateurId, cours_id: { not: null } },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
    select: { cours_id: true },
  });
  if (!evenement?.cours_id) return null;

  const cours = await prisma.cours.findFirst({
    where: { id: evenement.cours_id, statut: "publie", supprime_le: null },
    select: {
      id: true,
      titre: true,
      chapitre: {
        select: {
          id: true,
          libelle: true,
          matiere: { select: { id: true, libelle: true, statut: true, supprime_le: true } },
        },
      },
    },
  });
  if (!cours || cours.chapitre.matiere.statut !== "publie" || cours.chapitre.matiere.supprime_le) {
    return null;
  }

  return {
    coursId: cours.id.toString(),
    coursTitre: cours.titre,
    chapitreId: cours.chapitre.id.toString(),
    chapitreLibelle: cours.chapitre.libelle,
    matiereId: cours.chapitre.matiere.id.toString(),
    matiereLibelle: cours.chapitre.matiere.libelle,
  };
}

// Activité des 7 derniers jours pour le tableau de bord. Seuls des exercices
// écrivent au journal aujourd'hui (aide, correction, auto-évaluation) : une
// simple lecture vidéo n'y laisse aucune trace. « Cours actifs » compte donc
// les cours touchés via un exercice, pas visionnés — la seule lecture honnête
// possible tant que le lot 7 n'ajoute pas d'événement vidéo.
export async function obtenirActiviteSemaine(utilisateurId: bigint) {
  const depuis = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [coursTouches, exercicesTraites] = await Promise.all([
    prisma.evenementApprentissage.findMany({
      where: { utilisateur_id: utilisateurId, cree_le: { gte: depuis }, cours_id: { not: null } },
      distinct: ["cours_id"],
      select: { cours_id: true },
    }),
    prisma.evenementApprentissage.findMany({
      where: { utilisateur_id: utilisateurId, cree_le: { gte: depuis }, ressource_type: "exercice" },
      distinct: ["ressource_id"],
      select: { ressource_id: true },
    }),
  ]);
  return { nbCoursActifs: coursTouches.length, nbExercicesTraites: exercicesTraites.length };
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
      // Une partie non publiée (ou supprimée) masque ses chapitres, exactement
      // comme une matière non publiée masque les siens : sinon un chapitre
      // resterait accessible par URL directe même si sa partie est en
      // brouillon, alors qu'il a déjà disparu de la page matière.
      OR: [{ partie_id: null }, { partie: { statut: "publie", supprime_le: null } }],
    },
    select: {
      id: true,
      libelle: true,
      description: true,
      matiere: { select: { id: true, libelle: true } },
      partie: { select: { id: true, libelle: true } },
      cours: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: {
          id: true,
          titre: true,
          description: true,
          // Contrairement au chapitre, un cours porte une relation directe
          // vers `exercice` : un simple `_count`, sans somme à faire.
          _count: { select: { exercices: { where: { statut: "publie", supprime_le: null } } } },
        },
      },
    },
  });
  if (!chapitre) return null;
  return {
    ...chapitre,
    id: chapitre.id.toString(),
    matiere: { ...chapitre.matiere, id: chapitre.matiere.id.toString() },
    partie: chapitre.partie ? { id: chapitre.partie.id.toString(), libelle: chapitre.partie.libelle } : null,
    cours: chapitre.cours.map((cours) => ({
      id: cours.id.toString(),
      titre: cours.titre,
      description: cours.description,
      nbExercices: cours._count.exercices,
    })),
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
        // Même garde que `obtenirPageChapitrePubliee` : une partie non publiée
        // masque ses chapitres, y compris atteints depuis la page de cours.
        OR: [{ partie_id: null }, { partie: { statut: "publie", supprime_le: null } }],
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
          partie: { select: { id: true, libelle: true } },
          // Frères du cours courant, pour la navigation pédagogique (sidebar
          // « Cours du chapitre » et liens précédent/suivant) : un aller-retour
          // de plus dans la même requête, jamais une boucle par cours.
          cours: {
            where: { statut: "publie", supprime_le: null },
            orderBy: [{ ordre: "asc" }, { id: "asc" }],
            select: { id: true, titre: true },
          },
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
        select: { id: true, titre: true, type: true, fichier: { select: { taille: true } } },
      },
      exercices: {
        where: { statut: "publie", supprime_le: null },
        // L'ordre de déclaration de l'enum `categorie` fixe son ordre de tri
        // PostgreSQL natif (compréhension < type bac < approfondissement) :
        // trier dessus regroupe déjà les exercices par section d'affichage,
        // sans regroupement supplémentaire côté serveur.
        orderBy: [{ categorie: "asc" }, { ordre: "asc" }, { id: "asc" }],
        // Le contenu riche n'est pas sélectionné : la liste n'a besoin que des
        // libellés, et les énoncés complets traverseraient le cache pour rien.
        select: { id: true, titre: true, categorie: true },
      },
      // Contrairement à l'énoncé riche d'un exercice, ces champs sont légers et
      // non personnalisés : ils rejoignent l'agrégat mis en cache plutôt que
      // d'être lus à part. Seule la lecture du PDF lui-même reste à la demande
      // (filigrane nominatif, lot 5).
      extraits_nationaux: {
        where: { statut: "publie", supprime_le: null },
        orderBy: [{ ordre: "asc" }, { id: "asc" }],
        select: {
          id: true,
          annee: true,
          session: true,
          enonce: true,
          difficulte: true,
          duree_recommandee: true,
          correction_video_ref: true,
          sujet_document_id: true,
          correction_document_id: true,
        },
      },
      // Résumé léger seulement : jamais les questions (invariant 4), voir
      // `test/service.ts` (`obtenirTestPublie`, même condition de visibilité,
      // dupliquée ici pour rester dans l'agrégat mis en cache d'une seule
      // requête plutôt que d'en ajouter une seconde).
      test: {
        where: { statut: "publie", supprime_le: null },
        select: {
          id: true,
          titre: true,
          duree_minutes: true,
          _count: { select: { questions: { where: { supprime_le: null } } } },
        },
      },
    },
  });
  if (!cours) return null;
  // `extraits_nationaux`/`test` sont retirés du spread ci-dessous : la
  // version convertie de chacun est exposée sous un autre nom ou une autre
  // forme, donc un simple `...cours` laisserait fuiter la ligne brute — BigInt
  // compris — à côté de la version convertie, et `unstable_cache()` échoue à
  // sérialiser le résultat.
  const { extraits_nationaux, test, ...coursSansExtraitsBruts } = cours;
  return {
    ...coursSansExtraitsBruts,
    test: test
      ? {
          id: test.id.toString(),
          titre: test.titre,
          dureeMinutes: test.duree_minutes,
          nbQuestions: test._count.questions,
        }
      : null,
    id: cours.id.toString(),
    chapitre: {
      ...cours.chapitre,
      id: cours.chapitre.id.toString(),
      matiere: {
        ...cours.chapitre.matiere,
        id: cours.chapitre.matiere.id.toString(),
      },
      partie: cours.chapitre.partie
        ? { id: cours.chapitre.partie.id.toString(), libelle: cours.chapitre.partie.libelle }
        : null,
      cours: cours.chapitre.cours.map((frere) => ({
        id: frere.id.toString(),
        titre: frere.titre,
      })),
    },
    videos: cours.videos.map((video) => ({ ...video, id: video.id.toString() })),
    documents: cours.documents.map((document) => ({
      id: document.id.toString(),
      titre: document.titre,
      type: document.type,
      tailleOctets: document.fichier.taille,
    })),
    exercices: cours.exercices.map((exercice) => ({
      ...exercice,
      id: exercice.id.toString(),
    })),
    extraitsNationaux: extraits_nationaux.map((extrait) => ({
      id: extrait.id.toString(),
      annee: extrait.annee,
      session: extrait.session,
      enonce: extrait.enonce,
      difficulte: extrait.difficulte,
      dureeRecommandee: extrait.duree_recommandee,
      correctionVideoDisponible: extrait.correction_video_ref !== null,
      sujetDisponible: extrait.sujet_document_id !== null,
      correctionDisponible: extrait.correction_document_id !== null,
    })),
  };
}
