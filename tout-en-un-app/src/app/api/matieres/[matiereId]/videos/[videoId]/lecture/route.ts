import { NextResponse } from "next/server";
import { analyserIdentifiant } from "@/lib/identifiant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import {
  obtenirVideoPourLecture,
  verifierOrigineLectureVideo,
} from "@/modules/parcours-eleve/media";
import {
  lectureVideoParamsSchema,
  videoReferenceSchema,
} from "@/modules/parcours-eleve/schemas";

interface RouteParams {
  params: Promise<{ matiereId: string; videoId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const resultatParams = lectureVideoParamsSchema.safeParse(await params);
  if (!resultatParams.success) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }
  const matiereId = analyserIdentifiant(resultatParams.data.matiereId);
  const videoId = analyserIdentifiant(resultatParams.data.videoId);
  if (matiereId === null || videoId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }
  if (!verifierOrigineLectureVideo(request)) {
    return NextResponse.json({ erreur: "origine_non_autorisee" }, { status: 403 });
  }

  const video = await obtenirVideoPourLecture(matiereId, videoId);
  if (!video) {
    return NextResponse.json({ erreur: "video_introuvable" }, { status: 404 });
  }
  const reference = videoReferenceSchema.safeParse(video.video_ref);
  if (video.fournisseur !== "youtube" || !reference.success) {
    return NextResponse.json({ erreur: "fournisseur_non_pris_en_charge" }, { status: 422 });
  }

  // Une référence neutre n'est ni une URL ni une clé de stockage. Le client ne
  // la reçoit qu'après l'interaction et la nouvelle vérification d'accès.
  const reponse = NextResponse.json({
    fournisseur: video.fournisseur,
    reference: reference.data,
  });
  reponse.headers.set("Cache-Control", "private, no-store");
  return reponse;
}
