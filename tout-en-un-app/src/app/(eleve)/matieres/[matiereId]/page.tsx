import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BookOpen, ChevronRight, PlayCircle } from "lucide-react";
import { AccesRefuse } from "@/components/acces-refuse";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { TableauDeBord } from "@/components/eleve/tableau-de-bord";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { accorder } from "@/lib/pluriel";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirPageMatiereEnCache } from "@/modules/parcours-eleve/cache";
import { obtenirReprisePourMatiere } from "@/modules/parcours-eleve/service";
import { obtenirTableauDeBord } from "@/modules/parcours-eleve/tableau-de-bord";

interface MatierePageProps {
  params: Promise<{ matiereId: string }>;
}

interface ChapitreCarte {
  id: string;
  libelle: string;
  description: string | null;
  nbCours: number;
  nbExercices: number;
}

function ListeChapitres({ chapitres, matiereId }: { chapitres: ChapitreCarte[]; matiereId: string }) {
  return (
    <ul className="space-y-3">
      {chapitres.map((chapitre, index) => (
        <li key={chapitre.id}>
          <Link
            href={`/matieres/${matiereId}/chapitres/${chapitre.id}`}
            className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="flex flex-row flex-wrap items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <CardTitle className="flex-1 text-base">{chapitre.libelle}</CardTitle>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
                {chapitre.description && <p className="w-full">{chapitre.description}</p>}
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {chapitre.nbCours} {ELEVE_FR.chapitres.nbCours}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {chapitre.nbExercices}{" "}
                  {accorder(chapitre.nbExercices, ELEVE_FR.chapitres.nbExercice, ELEVE_FR.chapitres.nbExercices)}
                </span>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function MatierePage({ params }: MatierePageProps) {
  const utilisateur = await requireAuth();
  const { matiereId } = await params;
  const id = analyserIdentifiant(matiereId);
  if (id === null) notFound();

  const utilisateurId = BigInt(utilisateur.id);
  const acces = await verifierAccesMatiere(utilisateurId, id);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  // La reprise est lue à part, jamais mise en cache : elle dépend de cet
  // élève précis, un cache partagé livrerait le cours d'un autre.
  const [matiere, tableauDeBord, reprise] = await Promise.all([
    obtenirPageMatiereEnCache(id),
    obtenirTableauDeBord(utilisateurId, id),
    obtenirReprisePourMatiere(utilisateurId, id),
  ]);
  if (!matiere) notFound();

  return (
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <Link href="/matieres" className="inline-flex min-h-11 w-fit items-center text-sm font-medium hover:underline">
        {ELEVE_FR.navigation.retourMatieres}
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-secondary p-6 sm:p-8">
        <BookOpen
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-40 text-primary/10"
        />
        <div className="relative space-y-2">
          <h1 className="text-h1 font-bold tracking-tight text-secondary-foreground">
            {matiere.libelle}
          </h1>
          {matiere.description && (
            <p className="max-w-2xl text-body text-secondary-foreground/80">{matiere.description}</p>
          )}
        </div>
      </header>

      {reprise && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <PlayCircle aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-muted-foreground">{ELEVE_FR.matieres.dernierCoursConsulte}</p>
              <p className="truncate font-medium">{reprise.titre}</p>
            </div>
            <Link
              href={`/matieres/${matiere.id}/chapitres/${reprise.chapitreId}/cours/${reprise.coursId}`}
              className="shrink-0"
            >
              <Button type="button" className="min-h-11">
                {ELEVE_FR.matieres.continuer}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <TableauDeBord donnees={tableauDeBord} />

      {/* Lien statique, sans compte en direct : une page mise en cache et
          partagée par tous les élèves de la matière ne doit pas porter une
          requête propre à cet élève juste pour afficher un nombre. */}
      <Link
        href={`/matieres/${matiere.id}/examens`}
        className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-center gap-3 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Award aria-hidden="true" className="size-5" />
            </span>
            <span className="flex-1 font-medium">{ELEVE_FR.examensNationaux.lienMatiere}</span>
            <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <section aria-labelledby="chapitres-titre" className="space-y-3">
        <h2 id="chapitres-titre" className="text-h3 font-semibold">{ELEVE_FR.chapitres.titre}</h2>
        {matiere.parties.length === 0 ? (
          matiere.chapitresSansPartie.length === 0 ? (
            <p className="text-muted-foreground">{ELEVE_FR.chapitres.vide}</p>
          ) : (
            <ListeChapitres chapitres={matiere.chapitresSansPartie} matiereId={matiere.id} />
          )
        ) : (
          <div className="space-y-6">
            {matiere.parties.map((partie) => (
              <div key={partie.id} className="space-y-3">
                <h3 className="text-body font-semibold text-muted-foreground">{partie.libelle}</h3>
                {partie.chapitres.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">{ELEVE_FR.parties.vide}</p>
                ) : (
                  <ListeChapitres chapitres={partie.chapitres} matiereId={matiere.id} />
                )}
              </div>
            ))}
            {matiere.chapitresSansPartie.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-h3 font-semibold text-muted-foreground">{ELEVE_FR.parties.sansPartie}</h3>
                <ListeChapitres chapitres={matiere.chapitresSansPartie} matiereId={matiere.id} />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
