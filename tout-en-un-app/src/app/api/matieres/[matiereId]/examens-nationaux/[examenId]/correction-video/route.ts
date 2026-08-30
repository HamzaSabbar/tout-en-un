import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { obtenirFiliereEleve, verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { obtenirCorrectionVideoRefExamenNational } from "@/modules/contenu/examen-national";
import { verifierOrigineLectureVideo } from "@/modules/parcours-eleve/media";
import { videoReferenceSchema } from "@/modules/parcours-eleve/schemas";

interface RouteParams {
  params: Promise<{ matiereId: string; examenId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const examenId = analyserIdentifiant(valeurs.examenId);
  if (matiereId === null || examenId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }
  if (!verifierOrigineLectureVideo(request)) {
    return NextResponse.json({ erreur: "origine_non_autorisee" }, { status: 403 });
  }

  const filiere = await obtenirFiliereEleve(BigInt(utilisateur.id));
  if (!filiere) {
    return NextResponse.json({ erreur: "hors_filiere" }, { status: 403 });
  }

  const reference = await obtenirCorrectionVideoRefExamenNational(matiereId, filiere.id, examenId);
  const referenceNeutre = videoReferenceSchema.safeParse(reference);
  if (!referenceNeutre.success) {
    return NextResponse.json({ erreur: "video_introuvable" }, { status: 404 });
  }

  const reponse = NextResponse.json({ fournisseur: "youtube", reference: referenceNeutre.data });
  reponse.headers.set("Cache-Control", "private, no-store");
  return reponse;
}
