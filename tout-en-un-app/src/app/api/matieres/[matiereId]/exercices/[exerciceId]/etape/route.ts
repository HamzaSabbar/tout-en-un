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

// Journalisation d'une étape d'exercice qui n'a pas de contenu à renvoyer :
// l'énoncé vu, la correction vidéo ouverte, l'auto-évaluation. L'aide et la
// correction écrite ont leur propre route (`/aide`, `/correction`), parce
// qu'ouvrir ces deux étapes doit aussi renvoyer le contenu nouvellement
// débloqué — voir ces fichiers pour le détail et pour l'écriture idempotente
// qui les distingue des actions journalisées ici.
//
// **Pourquoi une route d'API et non une action serveur**, alors que c'est la
// forme habituelle d'un formulaire de back-office dans ce projet : ces étapes
// sont signalées depuis un composant client, à un moment que personne ne
// contrôle (montage réel, clic sur un bouton d'accordéon). Une action serveur
// embarque toujours un nouveau rendu de la page courante ; une réponse arrivant
// après celle d'un autre franchissement réappliquait un arbre calculé **avant**
// ce franchissement, et l'état qui venait de changer disparaissait. Un simple
// `fetch` suivi d'une mise à jour d'état locale, comme ici, n'a pas ce problème :
// rien ne pilote de nouveau rendu de la route derrière le dos du composant qui a
// fait l'appel.
//
// La route vérifie son autorisation elle-même (invariant 7) : le journal
// alimentera la progression du lot 7, un élève sans abonnement ne doit pas
// pouvoir y écrire.

const ETAPES = {
  enonce: ACTION_PAR_ETAPE.enonce,
  correction_video: ACTION_PAR_ETAPE.correctionVideo,
  reussi: "reussi",
  a_refaire: "a_refaire",
} as const;

type NomEtape = keyof typeof ETAPES;

const corpsSchema = z.object({
  chapitre_id: z.string().optional(),
  cours_id: z.string().optional(),
  etape: z.enum(Object.keys(ETAPES) as [NomEtape, ...NomEtape[]]),
});

export async function POST(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  // Une page d'un autre site pourrait appeler cette route avec les cookies de
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

  const corps = corpsSchema.safeParse(await request.json().catch(() => null));
  if (!corps.success) {
    return NextResponse.json({ erreur: "corps_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const chapitreId = analyserIdentifiant(corps.data.chapitre_id) ?? undefined;
  const coursId = analyserIdentifiant(corps.data.cours_id) ?? undefined;

  const ecrit = await enregistrerEvenement({
    utilisateurId: BigInt(utilisateur.id),
    matiereId,
    chapitreId,
    coursId,
    ressourceType: "exercice",
    ressourceId: exerciceId,
    action: ETAPES[corps.data.etape],
  });
  if (!ecrit) {
    return NextResponse.json({ erreur: "evenement_invalide" }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
