import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";
import { SESSIONS_EXAMEN } from "@/modules/contenu/session-examen";

function absentSiVide<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (valeur) => (typeof valeur === "string" && valeur.trim() === "" ? undefined : valeur),
    schema,
  );
}

function erreurCodeDoublon(erreur: unknown): erreur is Prisma.PrismaClientKnownRequestError {
  return erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002";
}

export const creerExamenNationalSchema = z.object({
  matiere_id: z.coerce.bigint(),
  filiere_id: z.coerce.bigint(),
  annee: z.coerce.number().int().min(2000).max(2100),
  session: z.enum(SESSIONS_EXAMEN),
  sujet_document_id: z.coerce.bigint(),
  correction_document_id: absentSiVide(z.coerce.bigint().optional()),
  correction_video_ref: absentSiVide(
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{6,64}$/)
      .optional(),
  ),
});
export type CreerExamenNationalInput = z.infer<typeof creerExamenNationalSchema>;

export const modifierExamenNationalSchema = creerExamenNationalSchema
  .omit({ matiere_id: true, filiere_id: true })
  .partial();
export type ModifierExamenNationalInput = z.infer<typeof modifierExamenNationalSchema>;

const ERREUR_DOUBLON =
  "Un examen existe déjà pour cette matière, cette année et cette session.";

export async function creerExamenNational(input: unknown): Promise<Resultat> {
  const donnees = creerExamenNationalSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  try {
    const examen = await prisma.examenNational.create({ data: donnees.data });
    return { succes: true, id: examen.id.toString() };
  } catch (erreur) {
    if (erreurCodeDoublon(erreur)) {
      return { succes: false, erreur: ERREUR_DOUBLON };
    }
    throw erreur;
  }
}

export async function modifierExamenNational(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierExamenNationalSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  try {
    const examen = await prisma.examenNational.update({ where: { id }, data: donnees.data });
    return { succes: true, id: examen.id.toString() };
  } catch (erreur) {
    if (erreurCodeDoublon(erreur)) {
      return { succes: false, erreur: ERREUR_DOUBLON };
    }
    throw erreur;
  }
}

// Vue back-office : tous les examens de la matière, toutes filières, les plus
// récents d'abord.
export function listerExamensNationaux(matiereId: bigint) {
  return prisma.examenNational.findMany({
    where: { matiere_id: matiereId, supprime_le: null },
    orderBy: [{ annee: "desc" }, { session: "asc" }],
    include: {
      filiere: true,
      sujet_document: { include: { fichier: true } },
      correction_document: { include: { fichier: true } },
    },
  });
}

export function obtenirExamenNational(id: bigint) {
  return prisma.examenNational.findFirst({ where: { id, supprime_le: null } });
}

export async function publierExamenNational(id: bigint): Promise<void> {
  await prisma.examenNational.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierExamenNational(id: bigint): Promise<void> {
  await prisma.examenNational.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerExamenNational(id: bigint): Promise<void> {
  await prisma.examenNational.update({ where: { id }, data: { supprime_le: new Date() } });
}

// Conditions de visibilité pour un élève : l'examen ET sa matière publiés, rien
// de supprimé, filière fournie par l'appelant (dérivée du profil élève côté
// serveur, jamais de l'URL — voir `obtenirFiliereEleve()` dans
// `src/modules/acces/acces-matiere.ts`).
function conditionExamenPublie(matiereId: bigint, filiereId: bigint) {
  return {
    matiere_id: matiereId,
    filiere_id: filiereId,
    statut: "publie" as const,
    supprime_le: null,
    matiere: { statut: "publie" as const, supprime_le: null },
  };
}

// Convertit les identifiants BigInt en chaînes : le résultat traverse
// `unstable_cache()` (voir `obtenirExamensNationauxEnCache`,
// `src/modules/parcours-eleve/cache.ts`), qui sérialise en JSON et échoue sur
// un BigInt brut.
export async function listerExamensNationauxPublies(matiereId: bigint, filiereId: bigint) {
  const examens = await prisma.examenNational.findMany({
    where: conditionExamenPublie(matiereId, filiereId),
    orderBy: [{ annee: "desc" }, { session: "asc" }],
    select: {
      id: true,
      annee: true,
      session: true,
      correction_video_ref: true,
      sujet_document_id: true,
      correction_document_id: true,
    },
  });
  return examens.map((examen) => ({
    id: examen.id.toString(),
    annee: examen.annee,
    session: examen.session,
    correction_video_ref: examen.correction_video_ref,
    sujet_document_id: examen.sujet_document_id?.toString() ?? null,
    correction_document_id: examen.correction_document_id?.toString() ?? null,
  }));
}

// Même règle que `extrait-national.ts` : `document.statut` n'est jamais lu, la
// visibilité vient uniquement du statut de `examen_national`.
interface DocumentPourLecture {
  cle_stockage: string;
  nom: string;
}

function documentLisible(document: {
  supprime_le: Date | null;
  fichier: { cle_stockage: string; nom: string; supprime_le: Date | null } | null;
} | null): DocumentPourLecture | null {
  if (!document || document.supprime_le || !document.fichier || document.fichier.supprime_le) {
    return null;
  }
  return { cle_stockage: document.fichier.cle_stockage, nom: document.fichier.nom };
}

export async function obtenirSujetExamenNational(
  matiereId: bigint,
  filiereId: bigint,
  examenId: bigint,
): Promise<DocumentPourLecture | null> {
  const examen = await prisma.examenNational.findFirst({
    where: { id: examenId, ...conditionExamenPublie(matiereId, filiereId) },
    select: {
      sujet_document: {
        select: { supprime_le: true, fichier: { select: { cle_stockage: true, nom: true, supprime_le: true } } },
      },
    },
  });
  return documentLisible(examen?.sujet_document ?? null);
}

export async function obtenirCorrectionExamenNational(
  matiereId: bigint,
  filiereId: bigint,
  examenId: bigint,
): Promise<DocumentPourLecture | null> {
  const examen = await prisma.examenNational.findFirst({
    where: { id: examenId, ...conditionExamenPublie(matiereId, filiereId) },
    select: {
      correction_document: {
        select: { supprime_le: true, fichier: { select: { cle_stockage: true, nom: true, supprime_le: true } } },
      },
    },
  });
  return documentLisible(examen?.correction_document ?? null);
}

export async function obtenirCorrectionVideoRefExamenNational(
  matiereId: bigint,
  filiereId: bigint,
  examenId: bigint,
): Promise<string | null> {
  const examen = await prisma.examenNational.findFirst({
    where: { id: examenId, ...conditionExamenPublie(matiereId, filiereId) },
    select: { correction_video_ref: true },
  });
  return examen?.correction_video_ref ?? null;
}
