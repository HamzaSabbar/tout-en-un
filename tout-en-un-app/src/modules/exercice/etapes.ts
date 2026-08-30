import {
  derniereActionParmi,
  historiqueRessource,
  type ActionApprentissage,
} from "@/modules/apprentissage/journal";
import {
  analyserAutoEvaluation,
  AUTO_EVALUATIONS,
  type AutoEvaluation,
} from "@/modules/exercice/auto-evaluation";

export { analyserAutoEvaluation, type AutoEvaluation };

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

export interface EtatEtapes {
  enonceVu: boolean;
  aideOuverte: boolean;
  correctionVue: boolean;
  correctionVideoVue: boolean;
  autoEvaluation: AutoEvaluation | null;
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
