import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";
import { SESSIONS_EXAMEN } from "@/modules/contenu/session-examen";

// Un champ de formulaire laissé vide arrive en chaîne vide, pas en `undefined` :
// sans ce préprocesseur, `.optional()` ne le traite pas comme absent. Même motif
// que `src/modules/exercice/service.ts`.
function absentSiVide<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (valeur) => (typeof valeur === "string" && valeur.trim() === "" ? undefined : valeur),
    schema,
  );
}

export const creerExtraitNationalSchema = z.object({
  matiere_id: z.coerce.bigint(),
  chapitre_id: z.coerce.bigint(),
  cours_id: z.coerce.bigint(),
  annee: z.coerce.number().int().min(2000).max(2100),
  session: z.enum(SESSIONS_EXAMEN),
  enonce: z.string().trim().min(1).max(2000),
  // Résolus par l'appelant avant validation : le formulaire téléverse le(s)
  // PDF via `televerserDocument()` en amont, puis passe les identifiants
  // obtenus. Le sujet est requis, la correction peut être ajoutée plus tard.
  sujet_document_id: z.coerce.bigint(),
  correction_document_id: absentSiVide(z.coerce.bigint().optional()),
  // Même référence neutre que `exercice.correction_video_ref`.
  correction_video_ref: absentSiVide(
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{6,64}$/)
      .optional(),
  ),
  duree_recommandee: absentSiVide(z.coerce.number().int().min(1).optional()),
  difficulte: absentSiVide(z.coerce.number().int().min(1).max(5).default(3)),
  ordre: absentSiVide(z.coerce.number().int().min(0).default(0)),
});
export type CreerExtraitNationalInput = z.infer<typeof creerExtraitNationalSchema>;

export const modifierExtraitNationalSchema = creerExtraitNationalSchema
  .omit({ matiere_id: true, chapitre_id: true, cours_id: true })
  .partial();
export type ModifierExtraitNationalInput = z.infer<typeof modifierExtraitNationalSchema>;

export async function creerExtraitNational(input: unknown): Promise<Resultat> {
  const donnees = creerExtraitNationalSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const extrait = await prisma.extraitNational.create({ data: donnees.data });
  return { succes: true, id: extrait.id.toString() };
}

export async function modifierExtraitNational(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierExtraitNationalSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const extrait = await prisma.extraitNational.update({ where: { id }, data: donnees.data });
  return { succes: true, id: extrait.id.toString() };
}

// Vue back-office : les brouillons sont visibles, les supprimés non.
export function listerExtraitsNationaux(coursId: bigint) {
  return prisma.extraitNational.findMany({
    where: { cours_id: coursId, supprime_le: null },
    orderBy: [{ ordre: "asc" }, { id: "asc" }],
    include: {
      sujet_document: { include: { fichier: true } },
      correction_document: { include: { fichier: true } },
    },
  });
}

export function obtenirExtraitNational(id: bigint) {
  return prisma.extraitNational.findFirst({ where: { id, supprime_le: null } });
}

export async function publierExtraitNational(id: bigint): Promise<void> {
  await prisma.extraitNational.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierExtraitNational(id: bigint): Promise<void> {
  await prisma.extraitNational.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerExtraitNational(id: bigint): Promise<void> {
  await prisma.extraitNational.update({ where: { id }, data: { supprime_le: new Date() } });
}

// Conditions de visibilité d'un extrait pour un élève : l'extrait, son cours,
// son chapitre et sa matière publiés, rien de supprimé. Même motif que
// `conditionExercicePublie` (`src/modules/exercice/service.ts`). L'appelant
// (route API) reste responsable d'appeler `verifierAccesMatiere()` en amont.
function conditionExtraitPublie(matiereId: bigint) {
  return {
    matiere_id: matiereId,
    statut: "publie" as const,
    supprime_le: null,
    cours: {
      statut: "publie" as const,
      supprime_le: null,
      chapitre: {
        statut: "publie" as const,
        supprime_le: null,
        matiere: { id: matiereId, statut: "publie" as const, supprime_le: null },
      },
    },
  };
}

// `document.statut` n'est jamais lu ici : un sujet/correction national reste en
// `brouillon` au sens de la table `document` (voir schema.prisma), c'est le
// statut de `extrait_national` qui décide seul de la visibilité. Un seul état à
// publier, pas deux à synchroniser.
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

export async function obtenirSujetExtraitNational(
  matiereId: bigint,
  extraitId: bigint,
): Promise<DocumentPourLecture | null> {
  const extrait = await prisma.extraitNational.findFirst({
    where: { id: extraitId, ...conditionExtraitPublie(matiereId) },
    select: {
      sujet_document: {
        select: { supprime_le: true, fichier: { select: { cle_stockage: true, nom: true, supprime_le: true } } },
      },
    },
  });
  return documentLisible(extrait?.sujet_document ?? null);
}

export async function obtenirCorrectionExtraitNational(
  matiereId: bigint,
  extraitId: bigint,
): Promise<DocumentPourLecture | null> {
  const extrait = await prisma.extraitNational.findFirst({
    where: { id: extraitId, ...conditionExtraitPublie(matiereId) },
    select: {
      correction_document: {
        select: { supprime_le: true, fichier: { select: { cle_stockage: true, nom: true, supprime_le: true } } },
      },
    },
  });
  return documentLisible(extrait?.correction_document ?? null);
}

export async function obtenirCorrectionVideoRefExtraitNational(
  matiereId: bigint,
  extraitId: bigint,
): Promise<string | null> {
  const extrait = await prisma.extraitNational.findFirst({
    where: { id: extraitId, ...conditionExtraitPublie(matiereId) },
    select: { correction_video_ref: true },
  });
  return extrait?.correction_video_ref ?? null;
}
