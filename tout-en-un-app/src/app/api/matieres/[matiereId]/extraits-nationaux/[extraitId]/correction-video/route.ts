import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { obtenirCorrectionVideoRefExtraitNational } from "@/modules/contenu/extrait-national";
import { verifierOrigineLectureVideo } from "@/modules/parcours-eleve/media";
import { videoReferenceSchema } from "@/modules/parcours-eleve/schemas";

interface RouteParams {
  params: Promise<{ matiereId: string; extraitId: string }>;
}

// Même contrat que la route de correction vidéo d'un exercice :
// `{ fournisseur, reference }`, sans filigrane (ce n'est pas un PDF).
export async function GET(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const extraitId = analyserIdentifiant(valeurs.extraitId);
  if (matiereId === null || extraitId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }
  if (!verifierOrigineLectureVideo(request)) {
    return NextResponse.json({ erreur: "origine_non_autorisee" }, { status: 403 });
  }

  const reference = await obtenirCorrectionVideoRefExtraitNational(matiereId, extraitId);
  const referenceNeutre = videoReferenceSchema.safeParse(reference);
  if (!referenceNeutre.success) {
    return NextResponse.json({ erreur: "video_introuvable" }, { status: 404 });
  }

  const reponse = NextResponse.json({ fournisseur: "youtube", reference: referenceNeutre.data });
  reponse.headers.set("Cache-Control", "private, no-store");
  return reponse;
}
