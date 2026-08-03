import { NextResponse } from "next/server";
import { analyserIdentifiant } from "@/lib/identifiant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import {
  genererLecturePdf,
  obtenirDocumentPourLecture,
} from "@/modules/parcours-eleve/media";
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

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const document = await obtenirDocumentPourLecture(matiereId, documentId);
  if (!document) {
    return NextResponse.json({ erreur: "document_introuvable" }, { status: 404 });
  }

  try {
    const url = await genererLecturePdf(document.fichier.cle_stockage);
    const reponse = NextResponse.redirect(url, 307);
    reponse.headers.set("Cache-Control", "private, no-store");
    return reponse;
  } catch {
    // La clé interne et le détail du fournisseur ne quittent jamais le serveur.
    return NextResponse.json({ erreur: "stockage_indisponible" }, { status: 503 });
  }
}
