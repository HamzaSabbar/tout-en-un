import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";
import {
  analyserDocumentRiche,
  champDocumentRicheObligatoireSchema,
  champDocumentRicheSchema,
  fichiersReferences,
  type DocumentRiche,
} from "@/modules/exercice/document-riche";

export const creerExerciceSchema = z.object({
  cours_id: z.coerce.bigint(),
  titre: z.string().trim().min(1).max(150),
  enonce: champDocumentRicheObligatoireSchema,
  aide: champDocumentRicheSchema.optional(),
  correction_texte: champDocumentRicheSchema.optional(),
  // Même règle que `video.video_ref` : une référence neutre, jamais une URL,
  // pour pouvoir changer d'hébergeur vidéo sans migration.
  correction_video_ref: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{6,64}$/)
    .optional(),
  // La borne est aussi une contrainte CHECK en base. Ici elle sert à répondre
  // « formulaire invalide » plutôt qu'à laisser PostgreSQL lever.
  difficulte: z.coerce.number().int().min(1).max(5).default(3),
  ordre: z.coerce.number().int().min(0).default(0),
});
export type CreerExerciceInput = z.infer<typeof creerExerciceSchema>;

export const modifierExerciceSchema = creerExerciceSchema.omit({ cours_id: true }).partial();

// Un champ facultatif laissé vide vaut NULL en base : le professeur doit pouvoir
// retirer une aide, pas seulement en ajouter une.
//
// `Prisma.DbNull` et non `null` : sur une colonne `Json` nullable, Prisma exige de
// distinguer le NULL SQL du littéral JSON `null`, qui est une valeur. C'est bien
// le NULL SQL qui est voulu, « pas d'aide » et non « une aide égale à null ».
// `undefined` reste `undefined` : le champ n'est alors pas touché par la mise à
// jour.
function valeurJson(document: DocumentRiche | null | undefined) {
  if (document === undefined) return undefined;
  return document ?? Prisma.DbNull;
}

export async function creerExercice(input: unknown): Promise<Resultat> {
  const donnees = creerExerciceSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const exercice = await prisma.exercice.create({
    data: {
      cours_id: donnees.data.cours_id,
      titre: donnees.data.titre,
      enonce: donnees.data.enonce,
      aide: valeurJson(donnees.data.aide),
      correction_texte: valeurJson(donnees.data.correction_texte),
      correction_video_ref: donnees.data.correction_video_ref,
      difficulte: donnees.data.difficulte,
      ordre: donnees.data.ordre,
    },
  });
  return { succes: true, id: exercice.id.toString() };
}

export async function modifierExercice(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierExerciceSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const exercice = await prisma.exercice.update({
    where: { id },
    data: {
      titre: donnees.data.titre,
      enonce: donnees.data.enonce,
      aide: valeurJson(donnees.data.aide),
      correction_texte: valeurJson(donnees.data.correction_texte),
      correction_video_ref: donnees.data.correction_video_ref,
      difficulte: donnees.data.difficulte,
      ordre: donnees.data.ordre,
    },
  });
  return { succes: true, id: exercice.id.toString() };
}

// Vue back-office : les brouillons sont visibles, les supprimés non.
export function listerExercices(coursId: bigint) {
  return prisma.exercice.findMany({
    where: { cours_id: coursId, supprime_le: null },
    orderBy: [{ ordre: "asc" }, { id: "asc" }],
  });
}

export function obtenirExercice(id: bigint) {
  return prisma.exercice.findFirst({ where: { id, supprime_le: null } });
}

export async function publierExercice(id: bigint): Promise<void> {
  await prisma.exercice.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierExercice(id: bigint): Promise<void> {
  await prisma.exercice.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerExercice(id: bigint): Promise<void> {
  await prisma.exercice.update({ where: { id }, data: { supprime_le: new Date() } });
}

// Conditions de visibilité d'un exercice pour un élève : l'exercice, son cours,
// son chapitre et sa matière publiés, et rien de supprimé. Écrit une seule fois,
// puis réutilisé par chaque lecture élève, pour qu'aucune n'en oublie un morceau.
function conditionExercicePublie(matiereId: bigint) {
  return {
    statut: "publie" as const,
    supprime_le: null,
    cours: {
      statut: "publie" as const,
      supprime_le: null,
      chapitre: {
        matiere_id: matiereId,
        statut: "publie" as const,
        supprime_le: null,
        matiere: { statut: "publie" as const, supprime_le: null },
      },
    },
  };
}

// Liste des exercices publiés d'un cours, pour la page de cours de l'élève. Le
// contenu riche n'est **pas** sélectionné : la liste n'a besoin que des libellés,
// et un énoncé complet par exercice traverserait le cache pour rien.
export function listerExercicesPublies(matiereId: bigint, coursId: bigint) {
  return prisma.exercice.findMany({
    where: { cours_id: coursId, ...conditionExercicePublie(matiereId) },
    orderBy: [{ ordre: "asc" }, { id: "asc" }],
    select: { id: true, titre: true, difficulte: true },
  });
}

// Lecture d'un exercice par un élève.
//
// L'aide et la correction ne sont renvoyées que si l'étape correspondante a été
// franchie. C'est le même raisonnement que l'invariant 4 sur les bonnes réponses
// d'un test : ce qui n'est pas encore dû à l'élève ne quitte pas le serveur. Les
// masquer en CSS ou les envoyer puis les cacher côté client laisserait la réponse
// lisible dans le HTML et dans la charge RSC.
export async function obtenirExercicePourEleve(
  matiereId: bigint,
  coursId: bigint,
  exerciceId: bigint,
  etapes: { aideOuverte: boolean; correctionVue: boolean },
) {
  const exercice = await prisma.exercice.findFirst({
    where: { id: exerciceId, cours_id: coursId, ...conditionExercicePublie(matiereId) },
    select: {
      id: true,
      titre: true,
      difficulte: true,
      enonce: true,
      aide: true,
      correction_texte: true,
      correction_video_ref: true,
      cours: { select: { id: true, titre: true, chapitre_id: true } },
    },
  });
  if (!exercice) return null;

  return {
    id: exercice.id,
    titre: exercice.titre,
    difficulte: exercice.difficulte,
    cours: exercice.cours,
    enonce: analyserDocumentRiche(exercice.enonce),
    // `aideDisponible` dit qu'une aide existe, sans en livrer le contenu : c'est
    // ce qui permet d'afficher ou non le bouton.
    aideDisponible: exercice.aide !== null,
    aide: etapes.aideOuverte ? analyserDocumentRiche(exercice.aide) : null,
    correctionDisponible: exercice.correction_texte !== null,
    correctionTexte: etapes.correctionVue ? analyserDocumentRiche(exercice.correction_texte) : null,
    correctionVideoDisponible: exercice.correction_video_ref !== null,
  };
}

// Référence de la vidéo de correction, servie par sa route dédiée. La référence
// reste neutre (identifiant plus fournisseur), jamais une URL.
export async function obtenirCorrectionVideoExercice(
  matiereId: bigint,
  exerciceId: bigint,
): Promise<string | null> {
  const exercice = await prisma.exercice.findFirst({
    where: { id: exerciceId, ...conditionExercicePublie(matiereId) },
    select: { correction_video_ref: true },
  });
  return exercice?.correction_video_ref ?? null;
}

// Autorise la lecture d'une image d'exercice.
//
// La règle est celle du contenu : l'exercice, son cours, son chapitre et sa
// matière doivent être publiés et non supprimés. S'y ajoute une condition propre
// aux images : le fichier demandé doit être **cité par cet exercice**. Sans elle,
// la route deviendrait un lecteur universel de la table `fichier` pour quiconque
// a accès à une matière, ce qui contournerait le contrôle par document.
//
// Les trois champs riches sont examinés, y compris l'aide et la correction. Une
// image n'est pas du contenu à révéler par étape : elle est opaque, et son
// identifiant n'atteint le client qu'avec le texte qui la cite. Le contrôle
// d'étape porte sur le contenu, pas sur les octets d'une image.
export async function obtenirImageExercice(
  matiereId: bigint,
  exerciceId: bigint,
  fichierId: bigint,
): Promise<{ cle_stockage: string; type_mime: string } | null> {
  const exercice = await prisma.exercice.findFirst({
    where: { id: exerciceId, ...conditionExercicePublie(matiereId) },
    select: { enonce: true, aide: true, correction_texte: true },
  });
  if (!exercice) return null;

  const cite = [exercice.enonce, exercice.aide, exercice.correction_texte]
    .map((champ) => analyserDocumentRiche(champ))
    .filter((document): document is DocumentRiche => document !== null)
    .flatMap((document) => fichiersReferences(document))
    .some((identifiant) => identifiant === fichierId);
  if (!cite) return null;

  const fichier = await prisma.fichier.findFirst({
    where: { id: fichierId, supprime_le: null },
    select: { cle_stockage: true, type_mime: true },
  });
  return fichier;
}
