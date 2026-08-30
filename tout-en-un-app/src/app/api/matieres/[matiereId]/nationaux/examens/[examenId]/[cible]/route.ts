import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { obtenirFiliereEleve, verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import {
  obtenirCorrectionExamenNational,
  obtenirSujetExamenNational,
} from "@/modules/contenu/examen-national";
import { genererPdfFiligrane, obtenirIdentiteFiligrane } from "@/modules/parcours-eleve/national";
import { lectureExamenNationalParamsSchema } from "@/modules/parcours-eleve/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ matiereId: string; examenId: string; cible: string }>;
}

// Même mécanique que la route des extraits ; la filière vient du profil de
// l'élève, jamais de l'URL (voir la décision de conception du lot 5).
export async function GET(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const resultatParams = lectureExamenNationalParamsSchema.safeParse(await params);
  if (!resultatParams.success) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }
  const { matiereId: matiereIdBrut, examenId: examenIdBrut, cible } = resultatParams.data;
  const matiereId = BigInt(matiereIdBrut);
  const examenId = BigInt(examenIdBrut);

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const filiere = await obtenirFiliereEleve(BigInt(utilisateur.id));
  if (!filiere) {
    return NextResponse.json({ erreur: "hors_filiere" }, { status: 403 });
  }

  const document =
    cible === "sujet"
      ? await obtenirSujetExamenNational(matiereId, filiere.id, examenId)
      : await obtenirCorrectionExamenNational(matiereId, filiere.id, examenId);
  if (!document) {
    return NextResponse.json({ erreur: "document_introuvable" }, { status: 404 });
  }

  const identite = await obtenirIdentiteFiligrane(BigInt(utilisateur.id));
  if (!identite) {
    return NextResponse.json({ erreur: "utilisateur_introuvable" }, { status: 404 });
  }

  try {
    const pdf = await genererPdfFiligrane(document.cle_stockage, identite);
    const telecharger = new URL(request.url).searchParams.get("telecharger") === "1";
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdf.byteLength.toString(),
        "Content-Disposition": telecharger ? "attachment" : "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ erreur: "stockage_indisponible" }, { status: 503 });
  }
}
