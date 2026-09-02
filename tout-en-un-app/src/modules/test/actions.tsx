"use server";

import type { ReactNode } from "react";
import { DocumentRicheVue } from "@/components/contenu-riche/document";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { demarrerOuReprendreTentative, soumettreTentative } from "@/modules/test/tentative";

// Démarrage et soumission d'un test : deux Server Actions plutôt qu'une
// route d'API, même raison que `demanderAideAction`/`demanderCorrectionAction`
// (src/modules/exercice/actions.tsx) — `DocumentRicheVue` est `server-only`
// et ne peut être rendue que dans le pipeline de rendu React, pas dans un
// `route.ts`. Chacune n'est appelée qu'une fois par écran (présentation puis
// restitution), jamais en rafale : contrairement à l'enregistrement d'une
// réponse à chaque clic (voir `.../tests/[testId]/reponse/route.ts`), il n'y
// a pas ici plusieurs franchissements différents qui pourraient se doubler
// et faire disparaître un état plus récent.

interface Contexte {
  matiereId: string;
  chapitreId?: string;
  coursId: string;
}

async function verifierEtResoudre(contexte: Contexte) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) return null;

  const matiereId = analyserIdentifiant(contexte.matiereId);
  const coursId = analyserIdentifiant(contexte.coursId);
  if (matiereId === null || coursId === null) return null;

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) return null;

  return {
    utilisateurId: BigInt(utilisateur.id),
    matiereId,
    coursId,
    chapitreId: analyserIdentifiant(contexte.chapitreId) ?? undefined,
  };
}

// Aucune image n'est proposée dans le formulaire d'auteur d'une question au
// MVP (`image_fichier_id` reste un champ modélisé, non activé, même statut
// que `reponse_courte`) : cette base sert uniquement à satisfaire la
// signature de `DocumentRicheVue`, aucune route ne la sert encore.
function baseUrlImagesTest(matiereId: bigint): string {
  return `/api/matieres/${matiereId}/tests/images`;
}

interface QuestionPourClient {
  id: string;
  type: string;
  enonce: ReactNode;
  points: number;
  options: { id: string; libelle: string }[];
}

export interface ReponseDemarrage {
  autorise: boolean;
  tentativeId?: string;
  dureeMinutes?: number;
  demarreLe?: string;
  questions?: QuestionPourClient[];
  reponses?: { questionId: string; optionId: string | null }[];
}

export async function demarrerTestAction(contexte: Contexte): Promise<ReponseDemarrage> {
  const resolu = await verifierEtResoudre(contexte);
  if (!resolu) return { autorise: false };

  const demarrage = await demarrerOuReprendreTentative(resolu.utilisateurId, resolu.matiereId, resolu.coursId);
  if (!demarrage) return { autorise: false };

  const baseUrlImages = baseUrlImagesTest(resolu.matiereId);
  return {
    autorise: true,
    tentativeId: demarrage.tentativeId,
    dureeMinutes: demarrage.dureeMinutes,
    demarreLe: demarrage.demarreLe,
    questions: demarrage.questions.map((question) => ({
      id: question.id,
      type: question.type,
      enonce: question.enonce ? (
        <DocumentRicheVue document={question.enonce} baseUrlImages={baseUrlImages} />
      ) : null,
      points: question.points,
      options: question.options,
    })),
    reponses: demarrage.reponses,
  };
}

interface QuestionRestitutionClient {
  id: string;
  enonce: ReactNode;
  optionChoisieId: string | null;
  correcte: boolean;
  options: { id: string; libelle: string; estCorrecte: boolean }[];
  explication: ReactNode | null;
}

export interface ReponseSoumission {
  autorise: boolean;
  score?: number;
  scoreMax?: number;
  pourcentage?: number;
  valide?: boolean;
  seuilValidation?: number;
  questions?: QuestionRestitutionClient[];
}

export async function soumettreTestAction(
  contexte: Contexte,
  tentativeIdStr: string,
): Promise<ReponseSoumission> {
  const resolu = await verifierEtResoudre(contexte);
  if (!resolu) return { autorise: false };

  const tentativeId = analyserIdentifiant(tentativeIdStr);
  if (tentativeId === null) return { autorise: false };

  const restitution = await soumettreTentative(
    resolu.utilisateurId,
    resolu.matiereId,
    resolu.chapitreId,
    resolu.coursId,
    tentativeId,
  );
  if (!restitution) return { autorise: false };

  const baseUrlImages = baseUrlImagesTest(resolu.matiereId);
  return {
    autorise: true,
    score: restitution.score,
    scoreMax: restitution.scoreMax,
    pourcentage: restitution.pourcentage,
    valide: restitution.valide,
    seuilValidation: restitution.seuilValidation,
    questions: restitution.questions.map((question) => ({
      id: question.id,
      enonce: question.enonce ? (
        <DocumentRicheVue document={question.enonce} baseUrlImages={baseUrlImages} />
      ) : null,
      optionChoisieId: question.optionChoisieId,
      correcte: question.correcte,
      options: question.options,
      explication: question.explication ? (
        <DocumentRicheVue document={question.explication} baseUrlImages={baseUrlImages} />
      ) : null,
    })),
  };
}
