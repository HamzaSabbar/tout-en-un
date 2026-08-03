"use server";

import { revalidatePath } from "next/cache";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { enregistrerEvenement } from "@/modules/apprentissage/journal";
import { ACTION_PAR_ETAPE, analyserAutoEvaluation } from "@/modules/exercice/etapes";

// Franchissement d'une étape d'exercice par l'élève.
//
// Chaque action vérifie l'accès à la matière par `verifierAccesMatiere()`, comme
// toute lecture de contenu : une action serveur est une entrée d'API comme une
// autre, l'invariant 7 ne s'arrête pas à la porte des composants. Un élève sans
// abonnement ne doit pas pouvoir écrire dans le journal d'une matière qu'il n'a
// pas, ne serait-ce que parce que le lot 7 en dérivera sa progression.
//
// Toutes reviennent en silence en cas de refus : ces actions sont déclenchées par
// un bouton, jamais par une saisie, donc il n'y a pas de message d'erreur utile à
// rendre. La page se réaffiche à l'état inchangé.

interface ContexteExercice {
  matiereId: bigint;
  chapitreId: bigint;
  coursId: bigint;
  exerciceId: bigint;
}

// Le contexte arrive soit des champs cachés d'un formulaire serveur, soit d'un
// appel direct depuis un composant client. Les deux passent par la même
// validation : un identifiant venu du client est traité comme hostile dans les
// deux cas.
export interface ValeursContexteExercice {
  matiereId: string;
  chapitreId: string;
  coursId: string;
  exerciceId: string;
}

function lireValeurs(valeurs: {
  matiereId: unknown;
  chapitreId: unknown;
  coursId: unknown;
  exerciceId: unknown;
}): ContexteExercice | null {
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const chapitreId = analyserIdentifiant(valeurs.chapitreId);
  const coursId = analyserIdentifiant(valeurs.coursId);
  const exerciceId = analyserIdentifiant(valeurs.exerciceId);
  if (matiereId === null || chapitreId === null || coursId === null || exerciceId === null) {
    return null;
  }
  return { matiereId, chapitreId, coursId, exerciceId };
}

function lireContexte(formData: FormData): ContexteExercice | null {
  return lireValeurs({
    matiereId: formData.get("matiere_id"),
    chapitreId: formData.get("chapitre_id"),
    coursId: formData.get("cours_id"),
    exerciceId: formData.get("exercice_id"),
  });
}

function cheminExercice(contexte: ContexteExercice): string {
  return `/matieres/${contexte.matiereId}/chapitres/${contexte.chapitreId}/cours/${contexte.coursId}/exercices/${contexte.exerciceId}`;
}

async function franchir(
  contexte: ContexteExercice,
  action: (typeof ACTION_PAR_ETAPE)[keyof typeof ACTION_PAR_ETAPE] | "reussi" | "a_refaire",
): Promise<boolean> {
  const utilisateur = await requireAuth();
  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), contexte.matiereId);
  if (!acces.autorise) return false;

  return enregistrerEvenement({
    utilisateurId: BigInt(utilisateur.id),
    matiereId: contexte.matiereId,
    chapitreId: contexte.chapitreId,
    coursId: contexte.coursId,
    ressourceType: "exercice",
    ressourceId: contexte.exerciceId,
    action,
  });
}

// Appelée depuis un composant client, au montage de la page, et non pendant le
// rendu serveur : Next préchargeant les pages au survol d'un lien, un
// enregistrement au rendu compterait des consultations qui n'ont pas eu lieu.
export async function marquerEnonceVuAction(
  valeurs: ValeursContexteExercice,
): Promise<void> {
  const contexte = lireValeurs(valeurs);
  if (!contexte) return;
  // Pas de `revalidatePath` : l'étape 1 ne change rien à ce qui est affiché, et
  // recharger la page au montage ferait clignoter l'énoncé.
  await franchir(contexte, ACTION_PAR_ETAPE.enonce);
}

export async function ouvrirAideAction(formData: FormData): Promise<void> {
  const contexte = lireContexte(formData);
  if (!contexte) return;
  if (await franchir(contexte, ACTION_PAR_ETAPE.aide)) {
    revalidatePath(cheminExercice(contexte));
  }
}

export async function voirCorrectionAction(formData: FormData): Promise<void> {
  const contexte = lireContexte(formData);
  if (!contexte) return;
  if (await franchir(contexte, ACTION_PAR_ETAPE.correctionTexte)) {
    revalidatePath(cheminExercice(contexte));
  }
}

// Franchie au clic sur la façade vidéo, donc depuis un composant client.
export async function marquerCorrectionVideoVueAction(
  valeurs: ValeursContexteExercice,
): Promise<void> {
  const contexte = lireValeurs(valeurs);
  if (!contexte) return;
  await franchir(contexte, ACTION_PAR_ETAPE.correctionVideo);
}

export async function autoEvaluerAction(formData: FormData): Promise<void> {
  const contexte = lireContexte(formData);
  if (!contexte) return;
  const resultat = analyserAutoEvaluation(formData.get("resultat"));
  if (!resultat) return;
  // Aucune vérification « a-t-il déjà répondu » : le journal est ajout seul, une
  // auto-évaluation revue écrit une deuxième ligne et c'est la plus récente qui
  // vaut.
  if (await franchir(contexte, resultat)) {
    revalidatePath(cheminExercice(contexte));
  }
}
