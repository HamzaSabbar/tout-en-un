import { prisma } from "@/lib/db";
import { enregistrerEvenement } from "@/modules/apprentissage/journal";
import { analyserDocumentRiche, type DocumentRiche } from "@/modules/exercice/document-riche";
import { conditionTestPublie } from "@/modules/test/service";

// Cycle de vie d'une tentative de test côté élève. Aucune requête d'ici ne
// sélectionne jamais `option_reponse.est_correcte` avant soumission
// (invariant 4) : les fonctions de démarrage/reprise choisissent
// explicitement les champs qu'elles renvoient, elles ne filtrent pas après
// coup.

interface OptionSansCorrection {
  id: string;
  libelle: string;
}

interface QuestionPourTentative {
  id: string;
  type: string;
  enonce: DocumentRiche | null;
  points: number;
  options: OptionSansCorrection[];
}

export interface DemarrageTentative {
  tentativeId: string;
  dureeMinutes: number;
  demarreLe: string;
  questions: QuestionPourTentative[];
  reponses: { questionId: string; optionId: string | null }[];
}

// Retentatives autorisées sans limite : une tentative déjà en cours
// (`termine_le: null`) est reprise, jamais dupliquée — c'est le critère de
// sortie du lot 6 (« un test interrompu puis repris conserve les réponses
// déjà saisies »). Une tentative terminée n'est jamais réutilisée : un
// nouveau départ en crée une nouvelle.
export async function demarrerOuReprendreTentative(
  utilisateurId: bigint,
  matiereId: bigint,
  coursId: bigint,
): Promise<DemarrageTentative | null> {
  const test = await prisma.test.findFirst({
    where: { cours_id: coursId, ...conditionTestPublie(matiereId) },
    select: { id: true, duree_minutes: true },
  });
  if (!test) return null;

  let tentative = await prisma.tentativeTest.findFirst({
    where: { test_id: test.id, utilisateur_id: utilisateurId, termine_le: null },
    orderBy: { demarre_le: "desc" },
  });
  if (!tentative) {
    tentative = await prisma.tentativeTest.create({
      data: { test_id: test.id, utilisateur_id: utilisateurId },
    });
  }

  const [questions, reponsesExistantes] = await Promise.all([
    prisma.questionTest.findMany({
      where: { test_id: test.id, supprime_le: null },
      orderBy: [{ ordre: "asc" }, { id: "asc" }],
      select: {
        id: true,
        type: true,
        enonce: true,
        points: true,
        // `est_correcte` n'est délibérément pas sélectionné : c'est
        // l'invariant 4, pas un oubli.
        options: {
          orderBy: { ordre: "asc" },
          select: { id: true, libelle: true },
        },
      },
    }),
    prisma.reponseTentative.findMany({
      where: { tentative_id: tentative.id },
      select: { question_test_id: true, option_id: true },
    }),
  ]);

  return {
    tentativeId: tentative.id.toString(),
    dureeMinutes: test.duree_minutes,
    demarreLe: tentative.demarre_le.toISOString(),
    questions: questions.map((question) => ({
      id: question.id.toString(),
      type: question.type,
      enonce: analyserDocumentRiche(question.enonce),
      points: question.points,
      options: question.options.map((option) => ({
        id: option.id.toString(),
        libelle: option.libelle,
      })),
    })),
    reponses: reponsesExistantes.map((reponse) => ({
      questionId: reponse.question_test_id.toString(),
      optionId: reponse.option_id?.toString() ?? null,
    })),
  };
}

// Sauvegarde progressive : une coupure réseau ne doit rien faire perdre.
// `upsert` sur la contrainte unique (tentative, question) — répondre à
// nouveau à la même question met simplement à jour la ligne, jamais une
// nouvelle. Vérifie que la tentative appartient bien à cet élève, n'est pas
// terminée, et que l'option appartient bien à la question du même test :
// sinon un élève pourrait écrire une réponse sur la tentative ou le test de
// quelqu'un d'autre.
export async function enregistrerReponse(
  utilisateurId: bigint,
  tentativeId: bigint,
  questionId: bigint,
  optionId: bigint,
): Promise<boolean> {
  const tentative = await prisma.tentativeTest.findFirst({
    where: { id: tentativeId, utilisateur_id: utilisateurId, termine_le: null },
    select: { id: true, test_id: true },
  });
  if (!tentative) return false;

  const option = await prisma.optionReponse.findFirst({
    where: {
      id: optionId,
      question_test_id: questionId,
      question: { test_id: tentative.test_id },
    },
    select: { id: true },
  });
  if (!option) return false;

  await prisma.reponseTentative.upsert({
    where: {
      tentative_id_question_test_id: { tentative_id: tentativeId, question_test_id: questionId },
    },
    create: { tentative_id: tentativeId, question_test_id: questionId, option_id: optionId },
    update: { option_id: optionId },
  });
  return true;
}

export interface QuestionRestitution {
  id: string;
  enonce: DocumentRiche | null;
  optionChoisieId: string | null;
  correcte: boolean;
  options: { id: string; libelle: string; estCorrecte: boolean }[];
  explication: DocumentRiche | null;
}

export interface Restitution {
  score: number;
  scoreMax: number;
  pourcentage: number;
  valide: boolean;
  seuilValidation: number;
  questions: QuestionRestitution[];
}

// Correction intégralement côté serveur (invariant 4) : relit les réponses
// déjà persistées par `enregistrerReponse`, jamais un corps envoyé par le
// client à cet instant — la sauvegarde progressive est la source de vérité,
// pas la requête de soumission. Idempotent : soumettre deux fois la même
// tentative (double clic, requête rejouée) renvoie la même restitution sans
// recorriger ni réémettre l'événement d'apprentissage une seconde fois.
export async function soumettreTentative(
  utilisateurId: bigint,
  matiereId: bigint,
  chapitreId: bigint | undefined,
  coursId: bigint,
  tentativeId: bigint,
): Promise<Restitution | null> {
  const tentative = await prisma.tentativeTest.findFirst({
    where: { id: tentativeId, utilisateur_id: utilisateurId },
    select: { id: true, test_id: true, termine_le: true, demarre_le: true },
  });
  if (!tentative) return null;

  const test = await prisma.test.findFirst({
    where: { id: tentative.test_id, ...conditionTestPublie(matiereId) },
    select: { seuil_validation: true },
  });
  if (!test) return null;

  const [questions, reponses] = await Promise.all([
    prisma.questionTest.findMany({
      where: { test_id: tentative.test_id, supprime_le: null },
      orderBy: [{ ordre: "asc" }, { id: "asc" }],
      include: { options: { orderBy: { ordre: "asc" } } },
    }),
    prisma.reponseTentative.findMany({ where: { tentative_id: tentative.id } }),
  ]);
  const reponseParQuestion = new Map(
    reponses.map((reponse) => [reponse.question_test_id.toString(), reponse]),
  );

  const dejaTerminee = tentative.termine_le !== null;
  let score = 0;
  let scoreMax = 0;
  const questionsRestitution: QuestionRestitution[] = [];
  const misesAJourReponse: { id: bigint; correcte: boolean }[] = [];

  for (const question of questions) {
    scoreMax += question.points;
    const reponse = reponseParQuestion.get(question.id.toString());
    const optionCorrecte = question.options.find((option) => option.est_correcte);
    const correcte = dejaTerminee
      ? Boolean(reponse?.correcte)
      : Boolean(reponse?.option_id && optionCorrecte && reponse.option_id === optionCorrecte.id);
    if (correcte) score += question.points;
    if (!dejaTerminee && reponse) misesAJourReponse.push({ id: reponse.id, correcte });

    questionsRestitution.push({
      id: question.id.toString(),
      enonce: analyserDocumentRiche(question.enonce),
      optionChoisieId: reponse?.option_id?.toString() ?? null,
      correcte,
      options: question.options.map((option) => ({
        id: option.id.toString(),
        libelle: option.libelle,
        estCorrecte: option.est_correcte,
      })),
      explication: analyserDocumentRiche(question.explication),
    });
  }

  const pourcentage = scoreMax > 0 ? Math.round((score / scoreMax) * 100) : 0;
  const valide = pourcentage >= test.seuil_validation;

  if (!dejaTerminee) {
    const dureeSecondes = Math.max(
      0,
      Math.round((Date.now() - tentative.demarre_le.getTime()) / 1000),
    );

    await prisma.$transaction([
      ...misesAJourReponse.map((maj) =>
        prisma.reponseTentative.update({ where: { id: maj.id }, data: { correcte: maj.correcte } }),
      ),
      prisma.tentativeTest.update({
        where: { id: tentative.id },
        data: { score, score_max: scoreMax, valide, termine_le: new Date() },
      }),
    ]);

    await enregistrerEvenement({
      utilisateurId,
      matiereId,
      chapitreId,
      coursId,
      ressourceType: "test",
      ressourceId: tentative.test_id,
      // Seule valeur de l'enum pour un test : elle nomme l'étape franchie
      // (le test a été passé), pas la réussite — celle-ci vit dans `valide`
      // et dans `valeur` (score), jamais dans le choix de l'action.
      action: "test_valide",
      valeur: pourcentage,
      dureeSecondes,
    });
  }

  return { score, scoreMax, pourcentage, valide, seuilValidation: test.seuil_validation, questions: questionsRestitution };
}

// Pour le badge « À faire » du bouton de test sur la page de cours : lu à
// part du cache partagé de la page (propre à cet élève), même motif que
// `obtenirReprisePourMatiere`.
export async function aUneTentativeTerminee(
  utilisateurId: bigint,
  matiereId: bigint,
  coursId: bigint,
): Promise<boolean> {
  const test = await prisma.test.findFirst({
    where: { cours_id: coursId, ...conditionTestPublie(matiereId) },
    select: { id: true },
  });
  if (!test) return false;

  const tentative = await prisma.tentativeTest.findFirst({
    where: { test_id: test.id, utilisateur_id: utilisateurId, termine_le: { not: null } },
    select: { id: true },
  });
  return tentative !== null;
}
