import { z } from "zod";
import { prisma } from "@/lib/db";
import { conditionExercicePublie } from "@/modules/exercice/service";

// Une note de carnet est propre à un élève et un exercice (`@@unique`), donc
// toutes les fonctions d'écriture ci-dessous s'adressent par
// (utilisateurId, exerciceId), jamais par l'id de la note : la contrainte
// unique garantit qu'il n'y en a qu'une, pas besoin d'un aller-retour de
// lookup séparé pour éditer ou supprimer la sienne.

const champTexte = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((valeur) => (valeur ? valeur : null));

const noteSchema = z.object({
  erreur: champTexte,
  retenu: champTexte,
});
export type NoteEntree = z.input<typeof noteSchema>;

export interface Note {
  erreur: string | null;
  retenu: string | null;
}

// Écrit (crée ou édite en place) la note de l'élève sur cet exercice. Ne
// touche jamais à `evenement_apprentissage` : le carnet est une donnée
// personnelle éditable, pas un fait d'événement immuable — voir le
// commentaire du modèle `CarnetErreur` dans `schema.prisma`. Renvoie `null`
// si l'exercice n'est pas visible pour cette matière (contexte incohérent
// ou altéré), jamais d'exception.
export async function enregistrerNote(
  utilisateurId: bigint,
  matiereId: bigint,
  exerciceId: bigint,
  donnees: unknown,
): Promise<Note | null> {
  const analyse = noteSchema.safeParse(donnees);
  if (!analyse.success) return null;

  const exercice = await prisma.exercice.findFirst({
    where: { id: exerciceId, ...conditionExercicePublie(matiereId) },
    select: { id: true },
  });
  if (!exercice) return null;

  const note = await prisma.carnetErreur.upsert({
    where: { utilisateur_id_exercice_id: { utilisateur_id: utilisateurId, exercice_id: exerciceId } },
    create: { utilisateur_id: utilisateurId, exercice_id: exerciceId, ...analyse.data },
    update: analyse.data,
    select: { erreur: true, retenu: true },
  });
  return note;
}

// Lecture pour le pré-remplissage du formulaire (spec : « si une note existe
// déjà, le formulaire s'ouvre pré-rempli, en mode édition »).
export async function obtenirNote(
  utilisateurId: bigint,
  matiereId: bigint,
  exerciceId: bigint,
): Promise<Note | null> {
  const exercice = await prisma.exercice.findFirst({
    where: { id: exerciceId, ...conditionExercicePublie(matiereId) },
    select: { id: true },
  });
  if (!exercice) return null;

  const note = await prisma.carnetErreur.findUnique({
    where: { utilisateur_id_exercice_id: { utilisateur_id: utilisateurId, exercice_id: exerciceId } },
    select: { erreur: true, retenu: true },
  });
  return note ?? { erreur: null, retenu: null };
}

// `deleteMany`, pas `delete` : un double-clic ou un rechargement qui rejoue
// la requête après une suppression déjà passée ne doit pas lever.
export async function supprimerNote(utilisateurId: bigint, exerciceId: bigint): Promise<void> {
  await prisma.carnetErreur.deleteMany({
    where: { utilisateur_id: utilisateurId, exercice_id: exerciceId },
  });
}

export interface NoteListee {
  id: string;
  erreur: string | null;
  retenu: string | null;
  creeLe: string;
  matiere: { id: string; libelle: string };
  chapitre: { id: string; libelle: string };
  cours: { id: string; titre: string };
  exercice: { id: string; titre: string };
}

const TAILLE_PAGE = 20;

// Liste paginée par curseur (règle non négociable : jamais de liste non
// bornée), avec le contexte joint pour l'affichage — un seul aller-retour,
// pas une requête par note pour retrouver matière/chapitre/cours.
export async function listerNotes(
  utilisateurId: bigint,
  options: { matiereId?: bigint; chapitreId?: bigint; curseurId?: bigint } = {},
): Promise<{ notes: NoteListee[]; curseurSuivant: string | null }> {
  const filtreCours = options.chapitreId
    ? { chapitre_id: options.chapitreId }
    : options.matiereId
      ? { chapitre: { matiere_id: options.matiereId } }
      : {};

  const lignes = await prisma.carnetErreur.findMany({
    where: { utilisateur_id: utilisateurId, exercice: { cours: filtreCours } },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
    take: TAILLE_PAGE + 1,
    ...(options.curseurId ? { cursor: { id: options.curseurId }, skip: 1 } : {}),
    select: {
      id: true,
      erreur: true,
      retenu: true,
      cree_le: true,
      exercice: {
        select: {
          id: true,
          titre: true,
          cours: {
            select: {
              id: true,
              titre: true,
              chapitre: {
                select: { id: true, libelle: true, matiere: { select: { id: true, libelle: true } } },
              },
            },
          },
        },
      },
    },
  });

  const aPlus = lignes.length > TAILLE_PAGE;
  const page = aPlus ? lignes.slice(0, TAILLE_PAGE) : lignes;

  return {
    notes: page.map((ligne) => ({
      id: ligne.id.toString(),
      erreur: ligne.erreur,
      retenu: ligne.retenu,
      creeLe: ligne.cree_le.toISOString(),
      matiere: {
        id: ligne.exercice.cours.chapitre.matiere.id.toString(),
        libelle: ligne.exercice.cours.chapitre.matiere.libelle,
      },
      chapitre: {
        id: ligne.exercice.cours.chapitre.id.toString(),
        libelle: ligne.exercice.cours.chapitre.libelle,
      },
      cours: { id: ligne.exercice.cours.id.toString(), titre: ligne.exercice.cours.titre },
      exercice: { id: ligne.exercice.id.toString(), titre: ligne.exercice.titre },
    })),
    curseurSuivant: aPlus ? page[page.length - 1].id.toString() : null,
  };
}

export interface OptionsFiltre {
  matieres: { id: string; libelle: string }[];
  chapitres: { id: string; libelle: string; matiereId: string }[];
}

// Peuple les deux menus déroulants de filtre : seules les matières/chapitres
// où l'élève a au moins une note apparaissent. Le nombre de notes d'un élève
// reste borné (une par exercice raté), pas besoin de pagination ici.
export async function matieresEtChapitresAvecNotes(utilisateurId: bigint): Promise<OptionsFiltre> {
  const lignes = await prisma.carnetErreur.findMany({
    where: { utilisateur_id: utilisateurId },
    select: {
      exercice: {
        select: {
          cours: {
            select: {
              chapitre: {
                select: { id: true, libelle: true, matiere: { select: { id: true, libelle: true } } },
              },
            },
          },
        },
      },
    },
  });

  const matieres = new Map<string, { id: string; libelle: string }>();
  const chapitres = new Map<string, { id: string; libelle: string; matiereId: string }>();
  for (const ligne of lignes) {
    const { chapitre } = ligne.exercice.cours;
    const matiereId = chapitre.matiere.id.toString();
    matieres.set(matiereId, { id: matiereId, libelle: chapitre.matiere.libelle });
    chapitres.set(chapitre.id.toString(), {
      id: chapitre.id.toString(),
      libelle: chapitre.libelle,
      matiereId,
    });
  }

  return {
    matieres: [...matieres.values()],
    chapitres: [...chapitres.values()],
  };
}
