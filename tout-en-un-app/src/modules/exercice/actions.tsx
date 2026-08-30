"use server";

import type { ReactNode } from "react";
import { DocumentRicheVue } from "@/components/contenu-riche/document";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { enregistrerEvenement } from "@/modules/apprentissage/journal";
import { ACTION_PAR_ETAPE } from "@/modules/exercice/etapes";
import { obtenirAideExercice, obtenirCorrectionExercice } from "@/modules/exercice/service";

// Demande de l'aide ou de la correction depuis l'accordéon de la page de
// cours : deux Server Actions plutôt que des routes d'API, parce qu'une route
// d'API ne peut pas rendre du React — `DocumentRicheVue` (`server-only`)
// importe `react-dom/server`, que Next refuse dans un `route.ts`, réservé aux
// fonctions Node/Edge ordinaires. Une Server Action, elle, tourne dans le même
// pipeline de rendu que les pages : elle peut renvoyer un élément React
// directement, qui arrive déjà composé chez l'appelant. Aucune formule
// n'atteint donc jamais KaTeX côté client, et aucune étape n'ouvre la porte à
// `dangerouslySetInnerHTML`.
//
// Ce n'est pas le mécanisme évité ailleurs dans ce module (voir
// `etape/route.ts` et architecture 9) : celui-là concernait des actions liées
// à un `<form>`, dont la réponse déclenche un nouveau rendu automatique de la
// route courante, piloté par le framework. Ici, l'action est appelée
// directement depuis un gestionnaire de clic, sans formulaire ni
// revalidation : rien ne pilote de nouveau rendu derrière le dos du composant
// qui a fait l'appel, exactement comme un `fetch` ordinaire.
//
// Next protège nativement les Server Actions contre les appels d'origine
// croisée (vérification de l'en-tête `Origin`) : pas besoin de reprendre ici
// le contrôle explicite que fait `etape/route.ts`.

interface Contexte {
  matiereId: string;
  exerciceId: string;
  chapitreId?: string;
  coursId?: string;
}

export interface ReponsePanneau {
  // `false` si l'élève n'a pas accès à la matière : le contenu de l'erreur
  // reste minimal, comme les routes d'API du même module.
  autorise: boolean;
  disponible: boolean;
  contenu?: ReactNode;
  videoDisponible?: boolean;
}

async function verifierEtResoudre(contexte: Contexte) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) return null;

  const matiereId = analyserIdentifiant(contexte.matiereId);
  const exerciceId = analyserIdentifiant(contexte.exerciceId);
  if (matiereId === null || exerciceId === null) return null;

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) return null;

  return {
    utilisateurId: BigInt(utilisateur.id),
    matiereId,
    exerciceId,
    chapitreId: analyserIdentifiant(contexte.chapitreId) ?? undefined,
    coursId: analyserIdentifiant(contexte.coursId) ?? undefined,
  };
}

export async function demanderAideAction(contexte: Contexte): Promise<ReponsePanneau> {
  const resolu = await verifierEtResoudre(contexte);
  if (!resolu) return { autorise: false, disponible: false };

  await enregistrerEvenement({
    utilisateurId: resolu.utilisateurId,
    matiereId: resolu.matiereId,
    chapitreId: resolu.chapitreId,
    coursId: resolu.coursId,
    ressourceType: "exercice",
    ressourceId: resolu.exerciceId,
    action: ACTION_PAR_ETAPE.aide,
  });

  const aide = await obtenirAideExercice(resolu.matiereId, resolu.exerciceId);
  if (!aide) return { autorise: true, disponible: false };

  const baseUrlImages = `/api/matieres/${resolu.matiereId}/exercices/${resolu.exerciceId}/images`;
  return {
    autorise: true,
    disponible: true,
    contenu: <DocumentRicheVue document={aide} baseUrlImages={baseUrlImages} />,
  };
}

export async function demanderCorrectionAction(contexte: Contexte): Promise<ReponsePanneau> {
  const resolu = await verifierEtResoudre(contexte);
  if (!resolu) return { autorise: false, disponible: false };

  await enregistrerEvenement({
    utilisateurId: resolu.utilisateurId,
    matiereId: resolu.matiereId,
    chapitreId: resolu.chapitreId,
    coursId: resolu.coursId,
    ressourceType: "exercice",
    ressourceId: resolu.exerciceId,
    action: ACTION_PAR_ETAPE.correctionTexte,
  });

  const correction = await obtenirCorrectionExercice(resolu.matiereId, resolu.exerciceId);
  if (!correction || !correction.texte) {
    return { autorise: true, disponible: false, videoDisponible: false };
  }

  const baseUrlImages = `/api/matieres/${resolu.matiereId}/exercices/${resolu.exerciceId}/images`;
  return {
    autorise: true,
    disponible: true,
    videoDisponible: correction.videoDisponible,
    contenu: <DocumentRicheVue document={correction.texte} baseUrlImages={baseUrlImages} />,
  };
}
