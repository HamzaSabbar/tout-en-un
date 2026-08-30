// Logique pure de l'auto-évaluation, séparée de `etapes.ts` : ce fichier
// n'importe rien qui touche la base (contrairement à `etatEtapesExercice`,
// qui lit le journal), donc un composant client peut l'importer directement.
// Sans cette séparation, importer `analyserAutoEvaluation` depuis
// `exercice-actions.tsx` entraînait tout `etapes.ts`, donc
// `modules/apprentissage/journal.ts`, donc le pilote PostgreSQL, dans le
// bundle du navigateur.
export const AUTO_EVALUATIONS = ["reussi", "a_refaire"] as const;

export type AutoEvaluation = (typeof AUTO_EVALUATIONS)[number];

export function analyserAutoEvaluation(valeur: unknown): AutoEvaluation | null {
  return AUTO_EVALUATIONS.find((candidate) => candidate === valeur) ?? null;
}
