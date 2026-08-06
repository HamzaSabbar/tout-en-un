import {
  derniereActionParmi,
  historiqueRessource,
  type ActionApprentissage,
} from "@/modules/apprentissage/journal";

// Les cinq étapes d'architecture 9 et l'action de journal que franchir chacune
// écrit :
//
//   1. énoncé              → `vue`
//   2. aide sur demande    → `aide_ouverte`
//   3. correction écrite   → `correction_vue`
//   4. correction vidéo    → `terminee`, « la correction a été parcourue jusqu'au
//                            bout ». L'étape n'existe que si une vidéo existe.
//   5. auto-évaluation     → `reussi` ou `a_refaire`
//
// Aucun état d'avancement n'est stocké : il se dérive du journal. Une ligne
// écrite est un fait, jamais une case à cocher qu'il faudrait tenir à jour.
export const ACTION_PAR_ETAPE = {
  enonce: "vue",
  aide: "aide_ouverte",
  correctionTexte: "correction_vue",
  correctionVideo: "terminee",
} as const satisfies Record<string, ActionApprentissage>;

const AUTO_EVALUATIONS = ["reussi", "a_refaire"] as const;

export type AutoEvaluation = (typeof AUTO_EVALUATIONS)[number];

export interface EtatEtapes {
  enonceVu: boolean;
  aideOuverte: boolean;
  correctionVue: boolean;
  correctionVideoVue: boolean;
  autoEvaluation: AutoEvaluation | null;
}

export function analyserAutoEvaluation(valeur: unknown): AutoEvaluation | null {
  return AUTO_EVALUATIONS.find((candidate) => candidate === valeur) ?? null;
}

export async function etatEtapesExercice(
  utilisateurId: bigint,
  exerciceId: bigint,
): Promise<EtatEtapes> {
  const historique = await historiqueRessource(utilisateurId, "exercice", exerciceId);
  const derniere = derniereActionParmi(historique, AUTO_EVALUATIONS);
  return {
    enonceVu: historique.includes(ACTION_PAR_ETAPE.enonce),
    aideOuverte: historique.includes(ACTION_PAR_ETAPE.aide),
    correctionVue: historique.includes(ACTION_PAR_ETAPE.correctionTexte),
    correctionVideoVue: historique.includes(ACTION_PAR_ETAPE.correctionVideo),
    // `derniereActionParmi` ne peut rendre qu'une des deux valeurs candidates ;
    // le passage par `analyserAutoEvaluation` évite d'affirmer ce type par une
    // assertion.
    autoEvaluation: analyserAutoEvaluation(derniere),
  };
}
