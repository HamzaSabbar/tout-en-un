import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { verifierOrigineLectureVideo } from "@/modules/parcours-eleve/media";
import { enregistrerReponse } from "@/modules/test/tentative";

interface RouteParams {
  params: Promise<{ matiereId: string; testId: string }>;
}

// Sauvegarde progressive d'une réponse de test, une par question, appelée à
// chaque changement de sélection. Route d'API plutôt qu'action serveur, même
// raison que `.../exercices/[exerciceId]/etape/route.ts` : appelée en
// rafale, à des moments qu'aucun formulaire ne pilote — une action serveur
// embarque toujours un nouveau rendu de la route courante, et une réponse
// arrivant après celle d'une question répondue plus récemment effacerait
// cette sélection plus récente à l'écran.
//
// `testId` du chemin ne sert qu'à situer la route dans l'arborescence REST ;
// l'autorisation réelle se vérifie via la tentative elle-même dans
// `enregistrerReponse` (appartient à cet élève, non terminée) et via
// l'option (appartient bien à la question du même test).

const corpsSchema = z.object({
  tentative_id: z.string(),
  question_test_id: z.string(),
  option_id: z.string(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  if (!verifierOrigineLectureVideo(request)) {
    return NextResponse.json({ erreur: "origine_non_autorisee" }, { status: 403 });
  }

  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  if (matiereId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const corps = corpsSchema.safeParse(await request.json().catch(() => null));
  if (!corps.success) {
    return NextResponse.json({ erreur: "corps_invalide" }, { status: 400 });
  }

  const tentativeId = analyserIdentifiant(corps.data.tentative_id);
  const questionId = analyserIdentifiant(corps.data.question_test_id);
  const optionId = analyserIdentifiant(corps.data.option_id);
  if (tentativeId === null || questionId === null || optionId === null) {
    return NextResponse.json({ erreur: "identifiant_invalide" }, { status: 400 });
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return NextResponse.json({ motif: acces.motif }, { status: 403 });
  }

  const enregistre = await enregistrerReponse(
    BigInt(utilisateur.id),
    tentativeId,
    questionId,
    optionId,
  );
  if (!enregistre) {
    return NextResponse.json({ erreur: "reponse_invalide" }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
