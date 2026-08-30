import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import {
  obtenirCorrectionExtraitNational,
  obtenirSujetExtraitNational,
} from "@/modules/contenu/extrait-national";
import { genererPdfFiligrane, obtenirIdentiteFiligrane } from "@/modules/parcours-eleve/national";
import { lectureExtraitNationalParamsSchema } from "@/modules/parcours-eleve/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ matiereId: string; extraitId: string; cible: string }>;
}

// Filigrane appliqué à chaque lecture autorisée, pas seulement au
// téléchargement : `?telecharger=1` ne change que `Content-Disposition`, les
// octets servis sont toujours tamponnés (voir la décision de conception du
// lot 5). Contrairement à `.../documents/[documentId]/lecture`, cette route
// ne redirige jamais vers une URL signée : les octets transitent réellement
// par le serveur, pour être tamponnés avant d'être renvoyés.
export async function GET(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const resultatParams = lectureExtraitNationalParamsSchema.safeParse(await params);
  if (!resultatParams.success) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }
  const { matiereId: matiereIdBrut, extraitId: extraitIdBrut, cible } = resultatParams.data;
  const matiereId = BigInt(matiereIdBrut);
  const extraitId = BigInt(extraitIdBrut);

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const document =
    cible === "sujet"
      ? await obtenirSujetExtraitNational(matiereId, extraitId)
      : await obtenirCorrectionExtraitNational(matiereId, extraitId);
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
    // La clé interne et le détail du fournisseur ne quittent jamais le serveur.
    return NextResponse.json({ erreur: "stockage_indisponible" }, { status: 503 });
  }
}
