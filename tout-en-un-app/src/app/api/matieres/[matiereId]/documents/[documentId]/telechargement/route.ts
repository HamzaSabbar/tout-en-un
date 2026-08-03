import { NextResponse } from "next/server";
import { analyserIdentifiant } from "@/lib/identifiant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { verifierDroitTelechargementDocument } from "@/modules/parcours-eleve/media";
import { lectureDocumentParamsSchema } from "@/modules/parcours-eleve/schemas";

interface RouteParams {
  params: Promise<{ matiereId: string; documentId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const resultatParams = lectureDocumentParamsSchema.safeParse(await params);
  if (!resultatParams.success) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }
  const matiereId = analyserIdentifiant(resultatParams.data.matiereId);
  const documentId = analyserIdentifiant(resultatParams.data.documentId);
  if (matiereId === null || documentId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const utilisateurId = BigInt(utilisateur.id);
  const acces = await verifierAccesMatiere(utilisateurId, matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const telechargementAutorise = await verifierDroitTelechargementDocument(
    utilisateurId,
    documentId,
  );
  if (!telechargementAutorise) {
    return NextResponse.json({ erreur: "telechargement_non_autorise" }, { status: 403 });
  }

  return NextResponse.json({ erreur: "telechargement_indisponible" }, { status: 501 });
}
