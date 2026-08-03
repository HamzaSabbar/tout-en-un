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
