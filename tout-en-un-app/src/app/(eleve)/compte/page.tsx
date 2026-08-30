import Link from "next/link";
import { BarChart3, BookOpen, Radio, Sparkles } from "lucide-react";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { EtatVide } from "@/components/eleve/etat-vide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { accorder } from "@/lib/pluriel";
import { requireAuth } from "@/modules/acces/require-auth";
import {
  listerMatieresPourEleve,
  obtenirActiviteSemaine,
  obtenirRepriseGlobale,
} from "@/modules/parcours-eleve/service";

export default async function ComptePage() {
  const utilisateur = await requireAuth();
  const utilisateurId = BigInt(utilisateur.id);

  const [matieres, reprise, activite] = await Promise.all([
    listerMatieresPourEleve(utilisateurId),
    obtenirRepriseGlobale(utilisateurId),
    obtenirActiviteSemaine(utilisateurId),
  ]);
  const aDeLActivite = activite.nbCoursActifs > 0 || activite.nbExercicesTraites > 0;

  return (
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <header>
        <h1 className="text-h1 font-bold tracking-tight">
          {ELEVE_FR.compte.bonjour} {utilisateur.prenom} 👋
        </h1>
        <p className="mt-1 text-body-sm text-muted-foreground">{ELEVE_FR.accueil.sousTitre}</p>
      </header>

      {reprise ? (
        <Card className="overflow-hidden border-none bg-primary text-primary-foreground">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-label uppercase tracking-wide text-primary-foreground/70">
                {ELEVE_FR.accueil.reprendre.titre}
              </p>
              <p className="truncate text-body-sm text-primary-foreground/80">
                {reprise.matiereLibelle} · {reprise.chapitreLibelle}
              </p>
              <p className="truncate text-h3 font-semibold">{reprise.coursTitre}</p>
            </div>
            <Link
              href={`/matieres/${reprise.matiereId}/chapitres/${reprise.chapitreId}/cours/${reprise.coursId}`}
              className="shrink-0"
            >
              <Button type="button" variant="secondary" className="h-11 w-full sm:w-auto">
                {ELEVE_FR.accueil.reprendre.cta}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Sparkles aria-hidden="true" className="size-6 text-muted-foreground" />
            <p className="font-medium">{ELEVE_FR.accueil.reprendre.videTitre}</p>
            <p className="text-body-sm text-muted-foreground">{ELEVE_FR.accueil.reprendre.videTexte}</p>
            <Link href="/matieres">
              <Button type="button" variant="outline" className="mt-2 h-11">
                {ELEVE_FR.navigation.matieres}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="mes-matieres-titre" className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="mes-matieres-titre" className="text-h3 font-semibold">
              {ELEVE_FR.accueil.mesMatieres.titre}
            </h2>
            {matieres.length > 0 && (
              <Link href="/matieres" className="text-body-sm font-medium text-primary hover:underline">
                {ELEVE_FR.accueil.mesMatieres.voirTout}
              </Link>
            )}
          </div>
          {matieres.length === 0 ? (
            <p className="rounded-xl border border-dashed p-5 text-body-sm text-muted-foreground">
              {ELEVE_FR.matieres.vide}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {matieres.slice(0, 4).map((matiere) => (
                <li key={matiere.id}>
                  <Link
                    href={`/matieres/${matiere.id}`}
                    className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <CardContent className="flex items-center gap-3 pt-6">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                          <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{matiere.libelle}</p>
                          <p className="text-caption text-muted-foreground">
                            {matiere.nbChapitres}{" "}
                            {accorder(matiere.nbChapitres, ELEVE_FR.matieres.nbChapitre, ELEVE_FR.matieres.nbChapitres)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="semaine-titre" className="space-y-3">
            <h2 id="semaine-titre" className="text-h3 font-semibold">
              {ELEVE_FR.accueil.semaine.titre}
            </h2>
            {aDeLActivite ? (
              <Card>
                <CardContent className="grid grid-cols-2 gap-4 pt-6 text-center">
                  <div>
                    <p className="text-h2 font-bold text-primary">{activite.nbCoursActifs}</p>
                    <p className="text-caption text-muted-foreground">
                      {accorder(
                        activite.nbCoursActifs,
                        ELEVE_FR.accueil.semaine.coursActif,
                        ELEVE_FR.accueil.semaine.coursActifs,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-h2 font-bold text-primary">{activite.nbExercicesTraites}</p>
                    <p className="text-caption text-muted-foreground">
                      {accorder(
                        activite.nbExercicesTraites,
                        ELEVE_FR.accueil.semaine.exerciceTraite,
                        ELEVE_FR.accueil.semaine.exercicesTraites,
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-body-sm text-muted-foreground">
                {ELEVE_FR.accueil.semaine.vide}
              </p>
            )}
          </section>

          <section aria-labelledby="live-titre" className="space-y-3">
            <h2 id="live-titre" className="text-h3 font-semibold">
              {ELEVE_FR.coquille.live}
            </h2>
            <EtatVide
              icone={Radio}
              titre={ELEVE_FR.accueil.live.videTitre}
              texte={ELEVE_FR.accueil.live.videTexte}
            />
          </section>

          <section aria-labelledby="resultats-titre" className="space-y-3">
            <h2 id="resultats-titre" className="text-h3 font-semibold">
              {ELEVE_FR.coquille.resultats}
            </h2>
            <EtatVide
              icone={BarChart3}
              titre={ELEVE_FR.accueil.resultats.videTitre}
              texte={ELEVE_FR.accueil.resultats.videTexte}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
