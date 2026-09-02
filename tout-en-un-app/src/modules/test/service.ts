import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";
import {
  champDocumentRicheObligatoireSchema,
  champDocumentRicheSchema,
  type DocumentRiche,
} from "@/modules/exercice/document-riche";

// Même préprocesseur que `chapitre.ts`/`exercice/service.ts` : un champ de
// formulaire vide arrive en chaîne vide, pas en `undefined`.
function absentSiVide<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (valeur) => (typeof valeur === "string" && valeur.trim() === "" ? undefined : valeur),
    schema,
  );
}

// Même motif que `valeurJson` dans `exercice/service.ts` : `Prisma.DbNull`,
// pas `null`, pour distinguer le NULL SQL du littéral JSON `null` sur une
// colonne `Json` nullable.
function valeurJson(document: DocumentRiche | null | undefined) {
  if (document === undefined) return undefined;
  return document ?? Prisma.DbNull;
}

export const creerTestSchema = z.object({
  cours_id: z.coerce.bigint(),
  titre: z.string().trim().min(1).max(150),
  consigne: absentSiVide(z.string().trim().max(2000).optional()),
  seuil_validation: absentSiVide(z.coerce.number().int().min(0).max(100).default(50)),
  duree_minutes: z.coerce.number().int().min(1).max(180),
});
export type CreerTestInput = z.infer<typeof creerTestSchema>;

export const modifierTestSchema = creerTestSchema.omit({ cours_id: true }).partial();

export async function creerTest(input: unknown): Promise<Resultat> {
  const donnees = creerTestSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const test = await prisma.test.create({ data: donnees.data });
  return { succes: true, id: test.id.toString() };
}

export async function modifierTest(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierTestSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const test = await prisma.test.update({ where: { id }, data: donnees.data });
  return { succes: true, id: test.id.toString() };
}

// Vue back-office : un seul test par cours au MVP (`cours_id` unique en
// base), brouillon compris.
export function obtenirTestAdmin(coursId: bigint) {
  return prisma.test.findFirst({ where: { cours_id: coursId, supprime_le: null } });
}

export async function publierTest(id: bigint): Promise<void> {
  await prisma.test.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierTest(id: bigint): Promise<void> {
  await prisma.test.update({ where: { id }, data: { statut: "brouillon" } });
}

// Emplacements fixes plutôt qu'une liste d'options dynamique : cohérent avec
// le reste des formulaires du back-office (champs contrôlés simples, aucun
// tableau ajoutable ailleurs dans l'admin). Cinq emplacements couvrent large
// un QCM classique et le vrai/faux (deux utilisés sur cinq).
const LETTRES_OPTION = ["a", "b", "c", "d", "e"] as const;
type LettreOption = (typeof LETTRES_OPTION)[number];

const creerQuestionTestSchemaBase = z.object({
  test_id: z.coerce.bigint(),
  // `reponse_courte` est modélisée (schéma Prisma) mais jamais proposée ici :
  // elle imposerait une correction manuelle ou une normalisation de texte
  // fragile (roadmap, lot 6, hors périmètre §19).
  type: z.enum(["qcm", "vrai_faux"]).default("qcm"),
  enonce: champDocumentRicheObligatoireSchema,
  explication: champDocumentRicheSchema.optional(),
  points: absentSiVide(z.coerce.number().int().min(1).max(20).default(1)),
  ordre: absentSiVide(z.coerce.number().int().min(0).default(0)),
  option_a: z.string().trim().min(1).max(300),
  option_b: z.string().trim().min(1).max(300),
  option_c: absentSiVide(z.string().trim().max(300).optional()),
  option_d: absentSiVide(z.string().trim().max(300).optional()),
  option_e: absentSiVide(z.string().trim().max(300).optional()),
  option_correcte: z.enum(LETTRES_OPTION),
});

export const creerQuestionTestSchema = creerQuestionTestSchemaBase.refine(
  (donnees) => Boolean(donnees[`option_${donnees.option_correcte}`]),
  { message: "L'option marquée correcte doit avoir un texte.", path: ["option_correcte"] },
);
export type CreerQuestionTestInput = z.infer<typeof creerQuestionTestSchema>;

export async function creerQuestionTest(input: unknown): Promise<Resultat> {
  const donnees = creerQuestionTestSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const options = LETTRES_OPTION.map((lettre) => ({
    lettre,
    libelle: donnees.data[`option_${lettre}`],
  })).filter(
    (option): option is { lettre: LettreOption; libelle: string } =>
      typeof option.libelle === "string" && option.libelle.length > 0,
  );

  const question = await prisma.$transaction(async (tx) => {
    const cree = await tx.questionTest.create({
      data: {
        test_id: donnees.data.test_id,
        type: donnees.data.type,
        enonce: donnees.data.enonce,
        explication: valeurJson(donnees.data.explication),
        points: donnees.data.points,
        ordre: donnees.data.ordre,
      },
    });
    await tx.optionReponse.createMany({
      data: options.map((option, index) => ({
        question_test_id: cree.id,
        libelle: option.libelle,
        est_correcte: option.lettre === donnees.data.option_correcte,
        ordre: index,
      })),
    });
    return cree;
  });

  return { succes: true, id: question.id.toString() };
}

// Vue back-office : options comprises, `est_correcte` visible — c'est
// l'admin qui les a saisies, rien à masquer ici.
export function listerQuestionsTest(testId: bigint) {
  return prisma.questionTest.findMany({
    where: { test_id: testId, supprime_le: null },
    orderBy: [{ ordre: "asc" }, { id: "asc" }],
    include: { options: { orderBy: { ordre: "asc" } } },
  });
}

export async function supprimerQuestionTest(id: bigint): Promise<void> {
  await prisma.questionTest.update({ where: { id }, data: { supprime_le: new Date() } });
}

export async function reordonnerQuestionsTest(idsOrdonnes: bigint[]): Promise<void> {
  await prisma.$transaction(
    idsOrdonnes.map((id, index) =>
      prisma.questionTest.update({ where: { id }, data: { ordre: index } }),
    ),
  );
}

// Conditions de visibilité d'un test pour un élève : le test, son cours, son
// chapitre et sa matière publiés, rien de supprimé — même motif que
// `conditionExercicePublie` dans `exercice/service.ts`. Exportée : réutilisée
// telle quelle par `tentative.ts`, pour qu'aucune des deux lectures n'oublie
// un morceau de la condition.
export function conditionTestPublie(matiereId: bigint) {
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

// Résumé léger d'un test publié, pour le bandeau de la page de cours élève :
// jamais les questions elles-mêmes (invariant 4), juste de quoi afficher le
// bouton « Commencer ».
export async function obtenirTestPublie(matiereId: bigint, coursId: bigint) {
  const test = await prisma.test.findFirst({
    where: { cours_id: coursId, ...conditionTestPublie(matiereId) },
    select: {
      id: true,
      titre: true,
      duree_minutes: true,
      _count: { select: { questions: { where: { supprime_le: null } } } },
    },
  });
  if (!test) return null;
  return {
    id: test.id.toString(),
    titre: test.titre,
    dureeMinutes: test.duree_minutes,
    nbQuestions: test._count.questions,
  };
}
