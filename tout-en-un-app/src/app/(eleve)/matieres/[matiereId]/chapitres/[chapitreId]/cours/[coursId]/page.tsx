import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, PenLine } from "lucide-react";
import { AccesRefuse } from "@/components/acces-refuse";
import { VideoFacade } from "@/components/eleve/video-facade";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirPageCoursEnCache } from "@/modules/parcours-eleve/cache";

interface CoursPageProps {
  params: Promise<{ matiereId: string; chapitreId: string; coursId: string }>;
}

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

  const cours = await obtenirPageCoursEnCache(matiereId, chapitreId, coursId);
  if (!cours) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <Link href={`/matieres/${matiereId}/chapitres/${chapitreId}`} className="inline-flex min-h-11 items-center text-sm font-medium hover:underline">
          {ELEVE_FR.navigation.retourChapitre}
        </Link>
        <p className="text-sm text-muted-foreground">
          {cours.chapitre.matiere.libelle} · {cours.chapitre.libelle}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{cours.titre}</h1>
        {cours.description && <p className="text-muted-foreground">{cours.description}</p>}
      </header>

      <section aria-labelledby="videos-titre" className="space-y-4">
        <h2 id="videos-titre" className="text-xl font-semibold">{ELEVE_FR.ressources.videos}</h2>
        {cours.videos.length === 0 ? (
          <p className="text-muted-foreground">{ELEVE_FR.ressources.aucuneVideo}</p>
        ) : (
          <ul className="space-y-5">
            {cours.videos.map((video) => (
              <li key={video.id.toString()}>
                <Card>
                  <CardHeader><CardTitle className="text-base">{video.titre}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {video.description && <p className="text-sm text-muted-foreground">{video.description}</p>}
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
        )}
      </section>

      <section aria-labelledby="documents-titre" className="space-y-4">
        <h2 id="documents-titre" className="text-xl font-semibold">{ELEVE_FR.ressources.documents}</h2>
        {cours.documents.length === 0 ? (
          <p className="text-muted-foreground">{ELEVE_FR.ressources.aucunDocument}</p>
        ) : (
          <ul className="space-y-3">
            {cours.documents.map((document) => (
              <li key={document.id.toString()} data-document-card={document.id.toString()}>
                <Card>
                  <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
                    <FileText aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
                    <p className="flex-1 font-medium">{document.titre}</p>
                    <a
                      href={`/api/matieres/${matiereId}/documents/${document.id}/lecture`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ className: "min-h-11" })}
                    >
                      {ELEVE_FR.ressources.ouvrirPdf}
                    </a>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="exercices-titre" className="space-y-4">
        <h2 id="exercices-titre" className="text-xl font-semibold">{ELEVE_FR.ressources.exercices}</h2>
        {cours.exercices.length === 0 ? (
          <p className="text-muted-foreground">{ELEVE_FR.ressources.aucunExercice}</p>
        ) : (
          <ul className="space-y-3">
            {cours.exercices.map((exercice) => (
              <li key={exercice.id} data-exercice-card={exercice.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
                    <PenLine aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{exercice.titre}</p>
                      <p className="text-sm text-muted-foreground">
                        {ELEVE_FR.exercice.difficulte} {exercice.difficulte}/5
                      </p>
                    </div>
                    <Link
                      href={`/matieres/${matiereId}/chapitres/${chapitreId}/cours/${coursId}/exercices/${exercice.id}`}
                      className={buttonVariants({ className: "min-h-11" })}
                    >
                      {ELEVE_FR.ressources.ouvrirExercice}
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
