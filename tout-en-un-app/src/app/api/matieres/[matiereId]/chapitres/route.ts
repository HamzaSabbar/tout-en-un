import { NextResponse } from "next/server";
import { analyserIdentifiant } from "@/lib/identifiant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { listerChapitresPublies } from "@/modules/contenu/chapitre";

interface RouteParams {
  params: Promise<{ matiereId: string }>;
}

// La route vérifie l'autorisation elle-même, indépendamment de l'interface
// (invariant 7). En cas de refus elle renvoie le seul motif : aucune ressource
// de la matière ne figure dans la réponse.
export async function GET(_request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const { matiereId } = await params;
  const id = analyserIdentifiant(matiereId);
  if (id === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), id);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const chapitres = await listerChapitresPublies(id);
  return NextResponse.json({
    chapitres: chapitres.map((chapitre) => ({
      id: chapitre.id.toString(),
      libelle: chapitre.libelle,
      description: chapitre.description,
      ordre: chapitre.ordre,
    })),
  });
}
