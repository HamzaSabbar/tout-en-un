import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ActionApprentissage, RessourceApprentissage } from "@/generated/prisma";

// Journal d'apprentissage : **le seul point d'écriture** de
// `evenement_apprentissage`. Même statut que `verifierAccesMatiere()` pour
// l'accès : une implémentation unique, ni dupliquée ni contournée. Toute la
// progression du lot 7 se dérivera de cette table, donc une écriture qui
// passerait à côté d'ici produirait une progression fausse sans laisser de trace.
//
// Le journal est **immuable et strictement ajout seul** (architecture 5.5) :
// aucune mise à jour, aucun `upsert`, aucune déduplication. Une étape franchie
// deux fois écrit deux lignes. Deux raisons : la statistique utile se calcule par
// `COUNT(DISTINCT utilisateur_id)`, qu'un écrasement rendrait faux ; et une
// auto-évaluation qui passe de `a_refaire` à `reussi` doit garder les deux faits,
// c'est la plus récente qui compte.
//
// Ce module n'écrit **aucun pourcentage** et ne tient aucun agrégat. Il écrit des
// faits. Les agrégats de progression et la table `parametre` appartiennent au
// lot 7.

const contexteSchema = z.object({
  utilisateurId: z.bigint(),
  matiereId: z.bigint(),
  // Facultatifs parce que toute ressource n'appartient pas à un cours : un examen
  // national ou un test de matière n'en a pas. `matiere_id` est en revanche
  // toujours connue, c'est l'unité d'accès et l'unité de progression.
  chapitreId: z.bigint().optional(),
  coursId: z.bigint().optional(),
});

const evenementSchema = contexteSchema.extend({
  ressourceType: z.enum(["video", "exercice", "extrait", "examen", "test"]),
  ressourceId: z.bigint(),
  action: z.enum([
    "vue",
    "terminee",
    "aide_ouverte",
    "correction_vue",
    "reussi",
    "a_refaire",
    "test_valide",
  ]),
  // Une note, un score, ce que l'action porte de mesurable. Jamais un
  // pourcentage de progression calculé : celui-là se dérive, il ne s'écrit pas.
  valeur: z.number().min(0).max(9999.99).optional(),
  dureeSecondes: z.number().int().min(0).optional(),
});

export type EvenementApprentissageInput = z.input<typeof evenementSchema>;
export type ContexteApprentissage = z.infer<typeof contexteSchema>;
export type { ActionApprentissage, RessourceApprentissage };

export async function enregistrerEvenement(
  input: EvenementApprentissageInput,
): Promise<boolean> {
  const donnees = evenementSchema.safeParse(input);
  if (!donnees.success) return false;

  await prisma.evenementApprentissage.create({
    data: {
      utilisateur_id: donnees.data.utilisateurId,
      matiere_id: donnees.data.matiereId,
      chapitre_id: donnees.data.chapitreId,
      cours_id: donnees.data.coursId,
      ressource_type: donnees.data.ressourceType,
      ressource_id: donnees.data.ressourceId,
      action: donnees.data.action,
      valeur: donnees.data.valeur,
      duree_secondes: donnees.data.dureeSecondes,
    },
  });
  return true;
}

// Lecture destinée au parcours élève : ce que cet élève a déjà fait sur cette
// ressource, du plus récent au plus ancien. C'est la seule lecture du journal, et
// l'étape atteinte s'en **dérive** : aucun état d'avancement n'est stocké
// ailleurs, donc il n'y a rien qui puisse contredire le journal.
//
// L'ordre décroissant compte : le journal étant ajout seul, une auto-évaluation
// revue laisse `a_refaire` et `reussi` côte à côte, et c'est la plus récente qui
// vaut. `id` départage deux lignes de même horodatage.
export async function historiqueRessource(
  utilisateurId: bigint,
  ressourceType: RessourceApprentissage,
  ressourceId: bigint,
): Promise<ActionApprentissage[]> {
  const lignes = await prisma.evenementApprentissage.findMany({
    where: {
      utilisateur_id: utilisateurId,
      ressource_type: ressourceType,
      ressource_id: ressourceId,
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
    select: { action: true },
  });
  return lignes.map((ligne) => ligne.action);
}

export async function actionsPosees(
  utilisateurId: bigint,
  ressourceType: RessourceApprentissage,
  ressourceId: bigint,
): Promise<Set<ActionApprentissage>> {
  return new Set(await historiqueRessource(utilisateurId, ressourceType, ressourceId));
}

// Dérivation pure : la plus récente des actions candidates, ou null. Séparée de
// la requête pour être vérifiable sans base.
export function derniereActionParmi(
  historique: ActionApprentissage[],
  candidates: readonly ActionApprentissage[],
): ActionApprentissage | null {
  return historique.find((action) => candidates.includes(action)) ?? null;
}
