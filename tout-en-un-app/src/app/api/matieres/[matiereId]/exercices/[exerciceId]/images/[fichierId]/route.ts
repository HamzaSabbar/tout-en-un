import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { obtenirImageExercice } from "@/modules/exercice/service";
import { genererLectureFichier } from "@/modules/parcours-eleve/media";

interface RouteParams {
  params: Promise<{ matiereId: string; exerciceId: string; fichierId: string }>;
}

// Lecture d'une image de contenu riche. Même forme que la route de lecture d'un
// PDF : contrôle d'accès ici, puis redirection 307 vers une URL signée de courte
// durée. Aucune clé de stockage ne quitte le serveur autrement que dans l'en-tête
// `Location` d'une réponse au corps vide.
export async function GET(_request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const exerciceId = analyserIdentifiant(valeurs.exerciceId);
  const fichierId = analyserIdentifiant(valeurs.fichierId);
  if (matiereId === null || exerciceId === null || fichierId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  // La route vérifie son autorisation elle-même, indépendamment de l'interface
  // qui a produit le lien (invariant 7).
  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  // Le service refuse aussi un fichier que cet exercice ne cite pas : sans cela,
  // l'identifiant d'exercice suffirait à lire n'importe quelle ligne de
  // `fichier`.
  const image = await obtenirImageExercice(matiereId, exerciceId, fichierId);
  if (!image) {
    return NextResponse.json({ erreur: "image_introuvable" }, { status: 404 });
  }

  try {
    const url = await genererLectureFichier(image.cle_stockage);
    const reponse = NextResponse.redirect(url, 307);
    reponse.headers.set("Cache-Control", "private, no-store");
    return reponse;
  } catch {
    return NextResponse.json({ erreur: "stockage_indisponible" }, { status: 503 });
  }
}
