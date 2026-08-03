import { prisma } from "@/lib/db";
import { storageService, type StorageService } from "@/lib/storage/storage";
import { env } from "@/lib/env";

export function verifierOrigineLectureVideo(requete: Request): boolean {
  const origineAutorisee = new URL(env.APP_URL).origin;
  const origine = requete.headers.get("origin");
  if (origine) return origine === origineAutorisee;
  return requete.headers.get("sec-fetch-site") === "same-origin";
}

export function obtenirVideoPourLecture(matiereId: bigint, videoId: bigint) {
  return prisma.video.findFirst({
    where: {
      id: videoId,
      statut: "publie",
      supprime_le: null,
      cours: {
        statut: "publie",
        supprime_le: null,
        chapitre: {
          matiere_id: matiereId,
          statut: "publie",
          supprime_le: null,
          matiere: { statut: "publie", supprime_le: null },
        },
      },
    },
    select: { fournisseur: true, video_ref: true },
  });
}

export function obtenirDocumentPourLecture(matiereId: bigint, documentId: bigint) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      statut: "publie",
      supprime_le: null,
      fichier: { supprime_le: null },
      OR: [
        { matiere_id: matiereId },
        {
          chapitre: {
            matiere_id: matiereId,
            statut: "publie",
            supprime_le: null,
          },
        },
        {
          cours: {
            statut: "publie",
            supprime_le: null,
            chapitre: {
              matiere_id: matiereId,
              statut: "publie",
              supprime_le: null,
            },
          },
        },
      ],
    },
    select: { fichier: { select: { cle_stockage: true } } },
  });
}

export async function genererLecturePdf(
  cle: string,
  stockage: Pick<StorageService, "genererUrlSignee"> = storageService,
) {
  return stockage.genererUrlSignee(cle, 600);
}

// Le schéma des offres ne porte pas encore ce droit. La lecture ne l'accorde
// donc jamais implicitement : un futur lot branchera cette source dédiée.
export async function verifierDroitTelechargementDocument(
  _utilisateurId: bigint,
  _documentId: bigint,
): Promise<boolean> {
  void _utilisateurId;
  void _documentId;
  return false;
}
