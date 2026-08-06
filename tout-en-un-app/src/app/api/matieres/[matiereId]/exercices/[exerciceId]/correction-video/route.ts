import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { obtenirCorrectionVideoExercice } from "@/modules/exercice/service";
import { verifierOrigineLectureVideo } from "@/modules/parcours-eleve/media";
import { videoReferenceSchema } from "@/modules/parcours-eleve/schemas";

interface RouteParams {
  params: Promise<{ matiereId: string; exerciceId: string }>;
}

// Même contrat de réponse que la route de lecture d'une vidéo de cours, pour que
// la façade vidéo soit la même de part et d'autre : `{ fournisseur, reference }`,
// et seulement après le clic de l'élève.
export async function GET(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const exerciceId = analyserIdentifiant(valeurs.exerciceId);
  if (matiereId === null || exerciceId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }
  if (!verifierOrigineLectureVideo(request)) {
    return NextResponse.json({ erreur: "origine_non_autorisee" }, { status: 403 });
  }

  const reference = await obtenirCorrectionVideoExercice(matiereId, exerciceId);
  const referenceNeutre = videoReferenceSchema.safeParse(reference);
  if (!referenceNeutre.success) {
    return NextResponse.json({ erreur: "video_introuvable" }, { status: 404 });
  }

  // Le champ `correction_video_ref` ne porte pas de fournisseur, contrairement à
  // `video.fournisseur`. YouTube est le seul hébergeur pris en charge par le
  // lecteur ; la valeur est annoncée explicitement plutôt que supposée par le
  // client.
  const reponse = NextResponse.json({ fournisseur: "youtube", reference: referenceNeutre.data });
  reponse.headers.set("Cache-Control", "private, no-store");
  return reponse;
}
