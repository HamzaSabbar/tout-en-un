import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { enregistrerEvenement } from "@/modules/apprentissage/journal";
import { ACTION_PAR_ETAPE } from "@/modules/exercice/etapes";
import { verifierOrigineLectureVideo } from "@/modules/parcours-eleve/media";

interface RouteParams {
  params: Promise<{ matiereId: string; exerciceId: string }>;
}

// Franchissement d'une étape d'exercice.
//
// **Pourquoi une route d'API et non des actions serveur**, alors que c'est la
// forme habituelle d'un formulaire de back-office dans ce projet :
//
// 1. Les deux étapes passives — afficher l'énoncé, demander la correction vidéo —
//    sont déclenchées depuis un composant client, donc à un moment que personne
//    ne contrôle. La réponse d'une action serveur embarque toujours un nouveau
//    rendu de la page courante ; une de ces réponses arrivant après celle d'un
//    franchissement réappliquait un arbre calculé **avant** ce franchissement, et
//    l'aide qui venait d'être révélée disparaissait.
// 2. Les trois étapes actives ont ensuite montré un défaut plus tenace : la
//    réponse de l'action contenait bien le rendu à jour — vérifié dans la trace —
//    mais le routeur client ne l'appliquait pas de façon fiable, laissant l'écran
//    figé, voire vide. Interrogée directement, la même URL rend pourtant 200 avec
//    la page complète : le serveur n'a jamais été en cause.
//
// Un formulaire HTML qui poste ici est une navigation de document ordinaire, pas
// une navigation du routeur client. Le 303 qui suit est suivi par le navigateur,
// qui recharge la page depuis le serveur. C'est le vieux POST-redirection-GET :
// déterministe, sans JavaScript, et insensible à l'état du cache de routeur.
// Le prix est un rechargement complet, acceptable pour trois clics par exercice.
//
// La route vérifie son autorisation elle-même (invariant 7) : le journal
// alimentera la progression du lot 7, un élève sans abonnement ne doit pas
// pouvoir y écrire.

const ETAPES = {
  // Passives : signalées en JSON depuis un composant client, sans redirection.
  enonce: { action: ACTION_PAR_ETAPE.enonce, redirige: false },
  correction_video: { action: ACTION_PAR_ETAPE.correctionVideo, redirige: false },
  // Actives : postées par un formulaire, suivies d'une redirection.
  aide: { action: ACTION_PAR_ETAPE.aide, redirige: true },
  correction: { action: ACTION_PAR_ETAPE.correctionTexte, redirige: true },
  reussi: { action: "reussi", redirige: true },
  a_refaire: { action: "a_refaire", redirige: true },
} as const;

type NomEtape = keyof typeof ETAPES;

const corpsSchema = z.object({
  chapitre_id: z.string().optional(),
  cours_id: z.string().optional(),
  etape: z.enum(Object.keys(ETAPES) as [NomEtape, ...NomEtape[]]),
});

async function lireCorps(request: Request): Promise<unknown> {
  const typeContenu = request.headers.get("content-type") ?? "";
  if (typeContenu.includes("application/json")) {
    return request.json().catch(() => null);
  }
  const formulaire = await request.formData().catch(() => null);
  return formulaire ? Object.fromEntries(formulaire.entries()) : null;
}

export async function POST(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  // Un formulaire d'un autre site pourrait poster ici avec les cookies de
  // l'élève. Le contrôle d'origine est le même que celui de la lecture vidéo.
  if (!verifierOrigineLectureVideo(request)) {
    return NextResponse.json({ erreur: "origine_non_autorisee" }, { status: 403 });
  }

  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const exerciceId = analyserIdentifiant(valeurs.exerciceId);
  if (matiereId === null || exerciceId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const corps = corpsSchema.safeParse(await lireCorps(request));
  if (!corps.success) {
    return NextResponse.json({ erreur: "corps_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const chapitreId = analyserIdentifiant(corps.data.chapitre_id) ?? undefined;
  const coursId = analyserIdentifiant(corps.data.cours_id) ?? undefined;
  const etape = ETAPES[corps.data.etape];

  const ecrit = await enregistrerEvenement({
    utilisateurId: BigInt(utilisateur.id),
    matiereId,
    chapitreId,
    coursId,
    ressourceType: "exercice",
    ressourceId: exerciceId,
    action: etape.action,
  });
  if (!ecrit) {
    return NextResponse.json({ erreur: "evenement_invalide" }, { status: 422 });
  }

  if (!etape.redirige) {
    // Corps vide : l'appelant n'a rien à afficher, et surtout rien à appliquer.
    return new NextResponse(null, { status: 204 });
  }

  // La redirection a besoin du chapitre et du cours pour reconstruire l'adresse
  // de la fiche. Sans eux, on ne sait pas où renvoyer l'élève.
  if (chapitreId === undefined || coursId === undefined) {
    return NextResponse.json({ erreur: "contexte_incomplet" }, { status: 400 });
  }

  // 303 et non 307 : la méthode doit repasser à GET, sans quoi le navigateur
  // reposterait le formulaire à l'adresse de destination.
  const destination = new URL(
    `/matieres/${matiereId}/chapitres/${chapitreId}/cours/${coursId}/exercices/${exerciceId}?etape=${corps.data.etape}`,
    request.url,
  );
  return NextResponse.redirect(destination, 303);
}
