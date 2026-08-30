import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, NotebookText } from "lucide-react";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { AccesRefuse } from "@/components/acces-refuse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { accorder } from "@/lib/pluriel";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirPageChapitreEnCache } from "@/modules/parcours-eleve/cache";

interface ChapitrePageProps {
  params: Promise<{ matiereId: string; chapitreId: string }>;
}

export default async function ChapitrePage({ params }: ChapitrePageProps) {
  const utilisateur = await requireAuth();
  const paramsResolus = await params;
  const matiereId = analyserIdentifiant(paramsResolus.matiereId);
  const chapitreId = analyserIdentifiant(paramsResolus.chapitreId);
  if (matiereId === null || chapitreId === null) notFound();

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const chapitre = await obtenirPageChapitreEnCache(matiereId, chapitreId);
  if (!chapitre) notFound();

  return (
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <Link href={`/matieres/${matiereId}`} className="inline-flex min-h-11 w-fit items-center text-sm font-medium hover:underline">
        {ELEVE_FR.navigation.retourMatiere}
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-secondary p-6 sm:p-8">
        <NotebookText
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-40 text-primary/10"
        />
        <div className="relative space-y-2">
          <p className="text-body-sm font-medium text-secondary-foreground/80">
            {chapitre.partie ? `${chapitre.matiere.libelle} · ${chapitre.partie.libelle}` : chapitre.matiere.libelle}
          </p>
          <h1 className="text-h1 font-bold tracking-tight text-secondary-foreground">
            {chapitre.libelle}
          </h1>
          {chapitre.description && (
            <p className="max-w-2xl text-body text-secondary-foreground/80">{chapitre.description}</p>
          )}
        </div>
      </header>

      <section aria-labelledby="cours-titre" className="space-y-3">
        <h2 id="cours-titre" className="text-h3 font-semibold">{ELEVE_FR.cours.titre}</h2>
        {chapitre.cours.length === 0 ? (
          <p className="text-muted-foreground">{ELEVE_FR.cours.vide}</p>
        ) : (
          <ul className="space-y-3">
            {chapitre.cours.map((cours, index) => (
              <li key={cours.id}>
                <Link
                  href={`/matieres/${matiereId}/chapitres/${chapitre.id}/cours/${cours.id}`}
                  className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="flex flex-row flex-wrap items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <CardTitle className="flex-1 text-base">{cours.titre}</CardTitle>
                      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-2">
                      {cours.description && (
                        <p className="w-full text-body-sm text-muted-foreground">{cours.description}</p>
                      )}
                      <span className="rounded-full bg-muted px-2.5 py-1 text-body-sm text-muted-foreground">
                        {cours.nbExercices}{" "}
                        {accorder(
                          cours.nbExercices,
                          ELEVE_FR.chapitres.nbExercice,
                          ELEVE_FR.chapitres.nbExercices,
                        )}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
