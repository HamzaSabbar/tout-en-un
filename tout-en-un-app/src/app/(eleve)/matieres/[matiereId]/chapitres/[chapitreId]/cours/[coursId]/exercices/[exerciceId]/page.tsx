import Link from "next/link";
import { notFound } from "next/navigation";
import { AccesRefuse } from "@/components/acces-refuse";
import { DocumentRicheVue } from "@/components/contenu-riche/document";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { MarqueurEtape } from "@/components/eleve/marqueur-etape";
import { VideoFacade } from "@/components/eleve/video-facade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import {
  autoEvaluerAction,
  marquerCorrectionVideoVueAction,
  marquerEnonceVuAction,
  ouvrirAideAction,
  voirCorrectionAction,
} from "@/modules/apprentissage/actions";
import { etatEtapesExercice } from "@/modules/exercice/etapes";
import { obtenirExercicePourEleve } from "@/modules/exercice/service";

interface ExercicePageProps {
  params: Promise<{
    matiereId: string;
    chapitreId: string;
    coursId: string;
    exerciceId: string;
  }>;
}

// Fiche d'exercice : cinq étapes, rendues côté serveur.
//
// La page n'est pas mise en cache, contrairement à la page de cours : ce qu'elle
// affiche dépend de ce que **cet** élève a déjà franchi. Un cache partagé
// livrerait la correction d'un élève à un autre.
//
// L'aide et la correction ne sont pas seulement masquées : le service ne les
// renvoie pas avant leur étape, donc elles ne sont ni dans le HTML, ni dans la
// charge RSC. Même raisonnement que l'invariant 4 sur les bonnes réponses d'un
// test.
export default async function ExercicePage({ params }: ExercicePageProps) {
  const utilisateur = await requireAuth();
  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const chapitreId = analyserIdentifiant(valeurs.chapitreId);
  const coursId = analyserIdentifiant(valeurs.coursId);
  const exerciceId = analyserIdentifiant(valeurs.exerciceId);
  if (matiereId === null || chapitreId === null || coursId === null || exerciceId === null) {
    notFound();
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const etapes = await etatEtapesExercice(BigInt(utilisateur.id), exerciceId);
  const exercice = await obtenirExercicePourEleve(matiereId, coursId, exerciceId, etapes);
  if (!exercice) notFound();

  const cheminCours = `/matieres/${matiereId}/chapitres/${chapitreId}/cours/${coursId}`;
  const contexte = {
    matiereId: matiereId.toString(),
    chapitreId: chapitreId.toString(),
    coursId: coursId.toString(),
    exerciceId: exerciceId.toString(),
  };

  // Les champs cachés voyagent en clair, donc chaque action les revalide et
  // revérifie l'accès à la matière avant d'écrire quoi que ce soit.
  const champsContexte = (
    <>
      <input type="hidden" name="matiere_id" value={contexte.matiereId} />
      <input type="hidden" name="chapitre_id" value={contexte.chapitreId} />
      <input type="hidden" name="cours_id" value={contexte.coursId} />
      <input type="hidden" name="exercice_id" value={contexte.exerciceId} />
    </>
  );

  const baseUrlImages = `/api/matieres/${matiereId}/exercices/${exerciceId}/images`;

  return (
    <main
      className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}
      data-exercice={exerciceId.toString()}
    >
      <MarqueurEtape signaler={marquerEnonceVuAction.bind(null, contexte)} />

      <header className="space-y-3">
        <Link
          href={cheminCours}
          className="inline-flex min-h-11 items-center text-sm font-medium hover:underline"
        >
          {ELEVE_FR.exercice.retourCours}
        </Link>
        <p className="text-sm text-muted-foreground">{exercice.cours.titre}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{exercice.titre}</h1>
          <Badge variant="secondary">
            {ELEVE_FR.exercice.difficulte} {exercice.difficulte}/5
          </Badge>
        </div>
      </header>

      {/* Deux colonnes à partir de 1024 px : l'énoncé reste sous les yeux
          pendant qu'on descend dans l'aide puis la correction. C'est l'écran qui
          gagne le plus à la largeur, et c'est ce qui a motivé à traiter la mise
          en page grand écran dans ce lot plutôt qu'à part.

          Une seule colonne en dessous, dans le même ordre. Rien n'est ajouté
          pour le grand écran : c'est le même contenu réparti autrement, donc le
          téléphone ne télécharge rien de plus et rien n'est masqué en CSS. */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <section
          aria-labelledby="enonce-titre"
          className="space-y-4 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto"
          data-etape="enonce"
        >
          <h2 id="enonce-titre" className="text-xl font-semibold">
            {ELEVE_FR.exercice.enonce}
          </h2>
          {exercice.enonce ? (
            <DocumentRicheVue document={exercice.enonce} baseUrlImages={baseUrlImages} />
          ) : (
            <p className="text-muted-foreground">{ELEVE_FR.exercice.contenuIllisible}</p>
          )}
        </section>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="aide-titre" className="space-y-4" data-etape="aide">
            <h2 id="aide-titre" className="text-xl font-semibold">
              {ELEVE_FR.exercice.aide}
            </h2>
            {!exercice.aideDisponible ? (
              <p className="text-muted-foreground">{ELEVE_FR.exercice.aideIndisponible}</p>
            ) : exercice.aide ? (
              <DocumentRicheVue document={exercice.aide} baseUrlImages={baseUrlImages} />
            ) : (
              <form action={ouvrirAideAction}>
                {champsContexte}
                <Button type="submit" variant="outline" className="min-h-11">
                  {ELEVE_FR.exercice.demanderAide}
                </Button>
              </form>
            )}
          </section>

          <section aria-labelledby="correction-titre" className="space-y-4" data-etape="correction">
            <h2 id="correction-titre" className="text-xl font-semibold">
              {ELEVE_FR.exercice.correction}
            </h2>
            {!exercice.correctionDisponible ? (
              <p className="text-muted-foreground">{ELEVE_FR.exercice.correctionIndisponible}</p>
            ) : exercice.correctionTexte ? (
              <DocumentRicheVue document={exercice.correctionTexte} baseUrlImages={baseUrlImages} />
            ) : (
              <form action={voirCorrectionAction}>
                {champsContexte}
                <Button type="submit" className="min-h-11">
                  {ELEVE_FR.exercice.voirCorrection}
                </Button>
              </form>
            )}
          </section>

          {/* Étape 4 : elle n'existe que si une correction vidéo existe, et elle
              n'apparaît qu'après la correction écrite — sinon la vidéo donnerait la
              réponse avant l'étape qui la porte. */}
          {exercice.correctionVideoDisponible && etapes.correctionVue && (
            <section
              aria-labelledby="correction-video-titre"
              className="space-y-4"
              data-etape="correction-video"
            >
              <h2 id="correction-video-titre" className="text-xl font-semibold">
                {ELEVE_FR.exercice.correctionVideo}
              </h2>
              <VideoFacade
                urlLecture={`/api/matieres/${matiereId}/exercices/${exerciceId}/correction-video`}
                cle={`exercice-${exerciceId}`}
                titre={`${ELEVE_FR.exercice.correctionVideo} — ${exercice.titre}`}
                signalerOuverture={marquerCorrectionVideoVueAction.bind(null, contexte)}
              />
            </section>
          )}

          <section aria-labelledby="auto-evaluation-titre" data-etape="auto-evaluation">
            <Card>
              <CardHeader>
                <CardTitle id="auto-evaluation-titre" className="text-base">
                  {ELEVE_FR.exercice.autoEvaluation}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {ELEVE_FR.exercice.autoEvaluationConsigne}
                </p>
                {etapes.autoEvaluation && (
                  <p role="status" className="text-sm font-medium">
                    {etapes.autoEvaluation === "reussi"
                      ? ELEVE_FR.exercice.reponseReussi
                      : ELEVE_FR.exercice.reponseARefaire}
                  </p>
                )}
                {/* Toujours proposé, même après une réponse : le journal est ajout
                    seul, changer d'avis écrit une ligne de plus et c'est la plus
                    récente qui vaut. */}
                <div className="flex flex-wrap gap-3">
                  <form action={autoEvaluerAction}>
                    {champsContexte}
                    <input type="hidden" name="resultat" value="reussi" />
                    <Button type="submit" className="min-h-11">
                      {ELEVE_FR.exercice.reussi}
                    </Button>
                  </form>
                  <form action={autoEvaluerAction}>
                    {champsContexte}
                    <input type="hidden" name="resultat" value="a_refaire" />
                    <Button type="submit" variant="outline" className="min-h-11">
                      {ELEVE_FR.exercice.aRefaire}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
