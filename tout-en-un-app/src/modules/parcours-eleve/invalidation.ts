import { revalidateTag } from "next/cache";

export function invaliderMatiere(matiereId: bigint) {
  revalidateTag(`matiere:${matiereId}`);
}

export function invaliderChapitre(matiereId: bigint, chapitreId: bigint) {
  invaliderMatiere(matiereId);
  revalidateTag(`chapitre:${chapitreId}`);
}

export function invaliderCours(
  matiereId: bigint,
  chapitreId: bigint,
  coursId: bigint,
) {
  invaliderChapitre(matiereId, chapitreId);
  revalidateTag(`cours:${coursId}`);
}

// La page « Examens nationaux » élève (lot 5) n'est pas rattachée à un cours :
// sa propre étiquette de cache, à part de `invaliderMatiere`.
export function invaliderExamensNationaux(matiereId: bigint) {
  revalidateTag(`examens:${matiereId}`);
}
