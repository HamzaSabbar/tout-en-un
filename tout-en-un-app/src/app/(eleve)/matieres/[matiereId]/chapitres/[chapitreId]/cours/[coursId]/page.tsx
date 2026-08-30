import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ChevronLeft, ChevronRight, FileText, ListChecks, PlayCircle } from "lucide-react";
import { AccesRefuse } from "@/components/acces-refuse";
import { DocumentRicheVue } from "@/components/contenu-riche/document";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { EtatVide } from "@/components/eleve/etat-vide";
import { ExerciceActions } from "@/components/eleve/exercice-actions";
import { ExerciceCarte } from "@/components/eleve/exercice-carte";
import { IndicateurDifficulte } from "@/components/eleve/indicateur-difficulte";
import { BarreOngletsCours, PanneauOnglet } from "@/components/eleve/onglets-cours";
import { VideoFacade } from "@/components/eleve/video-facade";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { accorder } from "@/lib/pluriel";
import { formaterTailleFichier } from "@/lib/taille-fichier";
import { cn } from "@/lib/utils";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirEnoncesExercices } from "@/modules/exercice/service";
import { obtenirPageCoursEnCache } from "@/modules/parcours-eleve/cache";

interface CoursPageProps {
  params: Promise<{ matiereId: string; chapitreId: string; coursId: string }>;
}

// Un document PDF sert soit à suivre le cours (support, résumé), soit à
// s'entraîner (sujet, corrigé) : deux sections honnêtes, dérivées du champ
// `type` déjà en base, pas d'un nouveau champ.
const TYPES_DOCUMENT_COURS = new Set(["cours_pdf", "resume_pdf"]);

export default async function CoursPage({ params }: CoursPageProps) {
  const utilisateur = await requireAuth();
  const valeurs = await params;
  const matiereId = analyserIdentifiant(valeurs.matiereId);
  const chapitreId = analyserIdentifiant(valeurs.chapitreId);
  const coursId = analyserIdentifiant(valeurs.coursId);
  if (matiereId === null || chapitreId === null || coursId === null) notFound();

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const [cours, enonces] = await Promise.all([
    obtenirPageCoursEnCache(matiereId, chapitreId, coursId),
    // Requête à part, non mise en cache : l'énoncé peut contenir images et
    // tableaux, et n'a pas sa place dans le cache partagé de la page de cours
    // (voir le commentaire de `obtenirPageCoursEnCache`). Un seul aller-retour
    // pour tous les exercices du cours, jamais un par exercice.
    obtenirEnoncesExercices(matiereId, coursId),
  ]);
  if (!cours) notFound();

  const documentsCours = cours.documents.filter((document) => TYPES_DOCUMENT_COURS.has(document.type));
  const documentsExercices = cours.documents.filter((document) => !TYPES_DOCUMENT_COURS.has(document.type));

  const freres = cours.chapitre.cours;
  const indexActuel = freres.findIndex((frere) => frere.id === cours.id);
  const precedent = indexActuel > 0 ? freres[indexActuel - 1] : null;
  const suivant = indexActuel >= 0 && indexActuel < freres.length - 1 ? freres[indexActuel + 1] : null;
  const urlCours = (id: string) => `/matieres/${matiereId}/chapitres/${chapitreId}/cours/${id}`;

  return (
    <div className={`${COQUILLE_ELEVE} py-8`}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-6">
          <header className="space-y-3">
            <nav aria-label="Fil d'ariane" className="flex flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground">
              <Link href={`/matieres/${matiereId}`} className="hover:text-foreground hover:underline">
                {cours.chapitre.matiere.libelle}
              </Link>
              <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
              {cours.chapitre.partie && (
                <>
                  <span>{cours.chapitre.partie.libelle}</span>
                  <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
                </>
              )}
              <Link href={`/matieres/${matiereId}/chapitres/${chapitreId}`} className="hover:text-foreground hover:underline">
                {cours.chapitre.libelle}
              </Link>
            </nav>
            <h1 className="text-h1 font-bold tracking-tight">{cours.titre}</h1>
            {cours.description && <p className="text-body text-muted-foreground">{cours.description}</p>}
          </header>

          <BarreOngletsCours />

          <PanneauOnglet cle="videos">
            {cours.videos.length === 0 ? (
              <EtatVide
                icone={PlayCircle}
                titre={ELEVE_FR.ressources.aucuneVideoTitre}
                texte={ELEVE_FR.ressources.aucuneVideoTexte}
              />
            ) : (
              <>
                <p className="text-body-sm text-muted-foreground">
                  {cours.videos.length}{" "}
                  {accorder(cours.videos.length, ELEVE_FR.ressources.nbVideos, ELEVE_FR.ressources.nbVideosPluriel)}{" "}
                  {ELEVE_FR.ressources.dansCeChapitre}
                </p>
                <ul className="grid gap-5 xl:grid-cols-2">
                  {cours.videos.map((video) => (
                    <li key={video.id.toString()}>
                      <Card>
                        <CardHeader><CardTitle className="text-base">{video.titre}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {video.description && (
                            <p className="text-body-sm text-muted-foreground">{video.description}</p>
                          )}
                          <VideoFacade
                            urlLecture={`/api/matieres/${matiereId}/videos/${video.id}/lecture`}
                            cle={video.id.toString()}
                            titre={video.titre}
                          />
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </PanneauOnglet>

          <PanneauOnglet cle="documents">
            {cours.documents.length === 0 ? (
              <EtatVide
                icone={FileText}
                titre={ELEVE_FR.ressources.aucunDocumentTitre}
                texte={ELEVE_FR.ressources.aucunDocumentTexte}
              />
            ) : (
              <>
                {documentsCours.length > 0 && (
                  <SectionDocuments
                    titre={ELEVE_FR.ressources.sectionCours}
                    description={ELEVE_FR.ressources.supportsDeCours}
                    documents={documentsCours}
                    matiereId={matiereId}
                  />
                )}
                {documentsExercices.length > 0 && (
                  <SectionDocuments
                    titre={ELEVE_FR.ressources.sectionExercices}
                    description={ELEVE_FR.ressources.seriesExercices}
                    documents={documentsExercices}
                    matiereId={matiereId}
                  />
                )}
              </>
            )}
          </PanneauOnglet>

          <PanneauOnglet cle="exercices">
            {cours.exercices.length === 0 ? (
              <EtatVide
                icone={ListChecks}
                titre={ELEVE_FR.ressources.aucunExerciceTitre}
                texte={ELEVE_FR.ressources.aucunExerciceTexte}
              />
            ) : (
              <ul className="space-y-4">
                {cours.exercices.map((exercice) => (
                  <li key={exercice.id} data-exercice-card={exercice.id}>
                    <ExerciceCarte titre={exercice.titre} difficulte={exercice.difficulte}>
                      <div className="rounded-lg border bg-muted/40 p-4">
                        <p className="mb-2 flex items-center gap-2 text-body-sm font-semibold text-muted-foreground">
                          <FileText aria-hidden="true" className="size-4" />
                          {ELEVE_FR.exercice.enonce}
                        </p>
                        {(() => {
                          const enonce = enonces.get(exercice.id);
                          return enonce ? (
                            <DocumentRicheVue
                              document={enonce}
                              baseUrlImages={`/api/matieres/${matiereId}/exercices/${exercice.id}/images`}
                            />
                          ) : (
                            <p className="text-muted-foreground">{ELEVE_FR.exercice.contenuIllisible}</p>
                          );
                        })()}
                      </div>
                      <ExerciceActions
                        matiereId={matiereId.toString()}
                        chapitreId={chapitreId.toString()}
                        coursId={coursId.toString()}
                        exerciceId={exercice.id}
                        titre={exercice.titre}
                      />
                    </ExerciceCarte>
                  </li>
                ))}
              </ul>
            )}
          </PanneauOnglet>

          <PanneauOnglet cle="extraits">
            {cours.extraitsNationaux.length === 0 ? (
              <EtatVide
                icone={Award}
                titre={ELEVE_FR.ressources.aucunExtraitTitre}
                texte={ELEVE_FR.ressources.aucunExtraitTexte}
              />
            ) : (
              <ul className="space-y-4">
                {cours.extraitsNationaux.map((extrait) => (
                  <li key={extrait.id}>
                    <Card>
                      <CardHeader className="flex flex-row items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                          <Award aria-hidden="true" className="size-4" />
                        </span>
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {extrait.annee} · {extrait.session === "normale" ? "Session normale" : "Rattrapage"}
                          </CardTitle>
                          <p className="text-body-sm text-muted-foreground">{extrait.enonce}</p>
                        </div>
                        <IndicateurDifficulte valeur={extrait.difficulte} />
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2">
                        {extrait.dureeRecommandee && (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-body-sm text-muted-foreground">
                            {extrait.dureeRecommandee} {ELEVE_FR.ressources.minutesRecommandees}
                          </span>
                        )}
                        {extrait.sujetDisponible && (
                          <a
                            href={`/api/matieres/${matiereId}/nationaux/extraits/${extrait.id}/sujet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline", className: "h-9" })}
                          >
                            {ELEVE_FR.ressources.sujet}
                          </a>
                        )}
                        {extrait.correctionDisponible && (
                          <a
                            href={`/api/matieres/${matiereId}/nationaux/extraits/${extrait.id}/correction`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline", className: "h-9" })}
                          >
                            {ELEVE_FR.ressources.correction}
                          </a>
                        )}
                      </CardContent>
                      {extrait.correctionVideoDisponible && (
                        <CardContent>
                          <p className="mb-2 text-body-sm font-semibold text-muted-foreground">
                            {ELEVE_FR.exercice.correctionVideo}
                          </p>
                          <VideoFacade
                            urlLecture={`/api/matieres/${matiereId}/extraits-nationaux/${extrait.id}/correction-video`}
                            cle={`extrait-${extrait.id}`}
                            titre={`${ELEVE_FR.exercice.correctionVideo} — ${extrait.enonce}`}
                          />
                        </CardContent>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </PanneauOnglet>

          {(precedent || suivant) && (
            <nav aria-label="Navigation entre cours" className="flex items-center justify-between gap-4 border-t pt-6">
              {precedent ? (
                <Link
                  href={urlCours(precedent.id)}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-body-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-caption">{ELEVE_FR.cours.precedent}</span>
                    <span className="block truncate">{precedent.titre}</span>
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {suivant && (
                <Link
                  href={urlCours(suivant.id)}
                  className="flex min-h-11 items-center gap-3 rounded-lg bg-primary px-4 text-primary-foreground hover:bg-primary/90"
                >
                  <span className="min-w-0 text-right">
                    <span className="block text-caption text-primary-foreground/70">{ELEVE_FR.cours.suivant}</span>
                    <span className="block truncate font-semibold">{suivant.titre}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
                </Link>
              )}
            </nav>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-3 rounded-xl border bg-card p-4">
            <p className="text-label uppercase tracking-wide text-muted-foreground">
              {ELEVE_FR.cours.coursDuChapitre}
            </p>
            <ul className="space-y-1">
              {freres.map((frere, index) => {
                const estActuel = frere.id === cours.id;
                return (
                  <li key={frere.id}>
                    <Link
                      href={urlCours(frere.id)}
                      aria-current={estActuel ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-body-sm transition-colors",
                        estActuel
                          ? "bg-secondary font-medium text-secondary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center text-caption text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate">{frere.titre}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionDocuments({
  titre,
  description,
  documents,
  matiereId,
}: {
  titre: string;
  description: string;
  documents: { id: string; titre: string; tailleOctets: number }[];
  matiereId: bigint;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <FileText aria-hidden="true" className="size-4" />
        </span>
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {titre}
            <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-normal text-muted-foreground">
              {documents.length} {accorder(documents.length, ELEVE_FR.ressources.nbDocument, ELEVE_FR.ressources.nbDocuments)}
            </span>
          </CardTitle>
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.map((document) => (
          <div
            key={document.id}
            data-document-card={document.id}
            className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
          >
            <FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{document.titre}</p>
              <p className="text-caption text-muted-foreground">PDF · {formaterTailleFichier(document.tailleOctets)}</p>
            </div>
            <a
              href={`/api/matieres/${matiereId}/documents/${document.id}/lecture`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", className: "h-9 shrink-0" })}
            >
              {ELEVE_FR.ressources.apercu}
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
