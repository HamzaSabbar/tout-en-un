"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import * as carnetService from "@/modules/carnet/service";
import type { Note } from "@/modules/carnet/service";

// Appelées directement depuis un gestionnaire de clic (jamais via un
// `<form>`), comme `demanderAideAction`/`demanderCorrectionAction`
// (`src/modules/exercice/actions.tsx`) : pas de nouveau rendu de page piloté
// par le framework qui écraserait un état local plus récent.

interface Contexte {
  matiereId: string;
  exerciceId: string;
}

export interface ReponseCarnet {
  // `false` si l'élève n'a pas accès à la matière ou si le contexte est
  // incohérent : même minimalisme que `ReponsePanneau`, aucun détail
  // supplémentaire à exposer.
  autorise: boolean;
  note: Note | null;
}

async function resoudre(contexte: Contexte) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) return null;

  const matiereId = analyserIdentifiant(contexte.matiereId);
  const exerciceId = analyserIdentifiant(contexte.exerciceId);
  if (matiereId === null || exerciceId === null) return null;

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) return null;

  return { utilisateurId: BigInt(utilisateur.id), matiereId, exerciceId };
}

export async function demanderCarnetAction(contexte: Contexte): Promise<ReponseCarnet> {
  const resolu = await resoudre(contexte);
  if (!resolu) return { autorise: false, note: null };

  const note = await carnetService.obtenirNote(resolu.utilisateurId, resolu.matiereId, resolu.exerciceId);
  return { autorise: true, note };
}

export async function enregistrerNoteCarnetAction(
  contexte: Contexte,
  donnees: { erreur?: string; retenu?: string },
): Promise<ReponseCarnet> {
  const resolu = await resoudre(contexte);
  if (!resolu) return { autorise: false, note: null };

  const note = await carnetService.enregistrerNote(
    resolu.utilisateurId,
    resolu.matiereId,
    resolu.exerciceId,
    donnees,
  );
  return { autorise: note !== null, note };
}

export async function supprimerNoteCarnetAction(contexte: Contexte): Promise<{ autorise: boolean }> {
  const resolu = await resoudre(contexte);
  if (!resolu) return { autorise: false };

  await carnetService.supprimerNote(resolu.utilisateurId, resolu.exerciceId);
  return { autorise: true };
}

// Page suivante du carnet, appelée depuis le bouton « Voir plus » de
// `/carnet` : pas de vérification d'accès à une matière ici, l'élève relit
// seulement ses propres notes déjà écrites (contrairement à `resoudre`,
// utilisé pour lire/écrire le contenu d'un exercice précis).
export async function obtenirPageCarnetAction(options: {
  matiereId?: string;
  chapitreId?: string;
  curseurId?: string;
}): Promise<{ notes: carnetService.NoteListee[]; curseurSuivant: string | null } | null> {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) return null;

  return carnetService.listerNotes(BigInt(utilisateur.id), {
    matiereId: analyserIdentifiant(options.matiereId) ?? undefined,
    chapitreId: analyserIdentifiant(options.chapitreId) ?? undefined,
    curseurId: analyserIdentifiant(options.curseurId) ?? undefined,
  });
}
