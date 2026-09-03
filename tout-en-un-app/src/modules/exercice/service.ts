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

// Un champ de formulaire laissé vide n'arrive pas en `undefined` mais en chaîne
// vide : `.optional()` seul ne le traite donc pas comme absent, et la validation
// échoue sur un champ que le professeur avait le droit de ne pas remplir. C'est
// exactement ce qui rendait impossible la création d'un exercice sans vidéo de
// correction, avec pour seul retour « Formulaire invalide ». La chaîne vide est
// ramenée à `undefined` avant validation, ce qui laisse jouer `.optional()` et les
// valeurs par défaut.
function absentSiVide<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (valeur) => (typeof valeur === "string" && valeur.trim() === "" ? undefined : valeur),
    schema,
  );
}

export const creerExerciceSchema = z.object({
  cours_id: z.coerce.bigint(),
  titre: z.string().trim().min(1).max(150),
  enonce: champDocumentRicheObligatoireSchema,
  aide: champDocumentRicheSchema.optional(),
  correction_texte: champDocumentRicheSchema.optional(),
  // Même règle que `video.video_ref` : une référence neutre, jamais une URL,
  // pour pouvoir changer d'hébergeur vidéo sans migration.
  correction_video_ref: absentSiVide(
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{6,64}$/)
      .optional(),
  ),
  categorie: z.enum(["comprehension", "type_bac", "approfondissement"]).default("comprehension"),
  ordre: absentSiVide(z.coerce.number().int().min(0).default(0)),
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
      categorie: donnees.data.categorie,
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
      categorie: donnees.data.categorie,
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

// Énoncés des exercices publiés d'un cours, pour la page de cours de l'élève.
// Une seule requête groupée pour tous les exercices du cours (jamais une par
// exercice), tenue à l'écart du cache partagé de la page de cours : un énoncé
// peut contenir des images et des tableaux, et gonflerait pour rien un cache
// commun à tous les élèves d'une heure sur l'autre.
//
// L'énoncé n'a pas la confidentialité de l'aide ou de la correction — c'est la
// question posée, pas la réponse — il peut donc être rendu directement, sans
// attendre qu'une étape soit franchie.
export async function obtenirEnoncesExercices(
  matiereId: bigint,
  coursId: bigint,
): Promise<Map<string, DocumentRiche | null>> {
  const exercices = await prisma.exercice.findMany({
    where: { cours_id: coursId, ...conditionExercicePublie(matiereId) },
    select: { id: true, enonce: true },
  });
  return new Map(
    exercices.map((exercice) => [exercice.id.toString(), analyserDocumentRiche(exercice.enonce)]),
  );
}

// Lecture de l'aide d'un exercice par un élève, au moment où il la demande.
//
// Ce que n'est pas encore dû à l'élève ne quitte pas le serveur : c'est
// l'appelant (la route `/aide`) qui décide, à partir du journal, s'il a le
// droit d'appeler cette fonction. Elle ne fait aucune vérification d'étape
// elle-même, uniquement de visibilité (exercice publié).
export async function obtenirAideExercice(
  matiereId: bigint,
  exerciceId: bigint,
): Promise<DocumentRiche | null> {
  const exercice = await prisma.exercice.findFirst({
    where: { id: exerciceId, ...conditionExercicePublie(matiereId) },
    select: { aide: true },
  });
  return exercice ? analyserDocumentRiche(exercice.aide) : null;
}

// Lecture de la correction écrite d'un exercice, avec l'existence (pas le
// contenu) d'une correction vidéo : c'est ce qui permet à l'appelant de
// proposer l'étape vidéo juste après, sans requête supplémentaire.
export async function obtenirCorrectionExercice(
  matiereId: bigint,
  exerciceId: bigint,
): Promise<{ texte: DocumentRiche | null; videoDisponible: boolean } | null> {
  const exercice = await prisma.exercice.findFirst({
    where: { id: exerciceId, ...conditionExercicePublie(matiereId) },
    select: { correction_texte: true, correction_video_ref: true },
  });
  if (!exercice) return null;
  return {
    texte: analyserDocumentRiche(exercice.correction_texte),
    videoDisponible: exercice.correction_video_ref !== null,
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
