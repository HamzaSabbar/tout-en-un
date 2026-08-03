import { unstable_cache } from "next/cache";
import {
  obtenirPageChapitrePubliee,
  obtenirPageCoursPubliee,
  obtenirPageMatierePubliee,
} from "@/modules/parcours-eleve/service";

const DUREE_CACHE_STRUCTURE = 60 * 60;

export function obtenirPageMatiereEnCache(matiereId: bigint) {
  const id = matiereId.toString();
  return unstable_cache(
    () => obtenirPageMatierePubliee(matiereId),
    ["parcours-eleve", "matiere", id],
    { tags: [`matiere:${id}`], revalidate: DUREE_CACHE_STRUCTURE },
  )();
}

export function obtenirPageChapitreEnCache(matiereId: bigint, chapitreId: bigint) {
  const matiere = matiereId.toString();
  const chapitre = chapitreId.toString();
  return unstable_cache(
    () => obtenirPageChapitrePubliee(matiereId, chapitreId),
    ["parcours-eleve", "chapitre", matiere, chapitre],
    {
      tags: [`matiere:${matiere}`, `chapitre:${chapitre}`],
      revalidate: DUREE_CACHE_STRUCTURE,
    },
  )();
}

export function obtenirPageCoursEnCache(
  matiereId: bigint,
  chapitreId: bigint,
  coursId: bigint,
) {
  const matiere = matiereId.toString();
  const chapitre = chapitreId.toString();
  const cours = coursId.toString();
  return unstable_cache(
    () => obtenirPageCoursPubliee(matiereId, chapitreId, coursId),
    ["parcours-eleve", "cours", matiere, chapitre, cours],
    {
      tags: [`matiere:${matiere}`, `chapitre:${chapitre}`, `cours:${cours}`],
      revalidate: DUREE_CACHE_STRUCTURE,
    },
  )();
}
