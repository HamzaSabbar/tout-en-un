import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { accorder } from "@/lib/pluriel";
import { requireAuth } from "@/modules/acces/require-auth";
import { listerMatieresPourEleve } from "@/modules/parcours-eleve/service";

export default async function MatieresPage() {
  const utilisateur = await requireAuth();
  const matieres = await listerMatieresPourEleve(BigInt(utilisateur.id));

  return (
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <header className="relative overflow-hidden rounded-2xl bg-secondary p-6 sm:p-8">
        <GraduationCap
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-40 text-primary/10"
        />
        <div className="relative space-y-2">
          <h1 className="text-h1 font-bold tracking-tight text-secondary-foreground">
            {ELEVE_FR.matieres.titre}
          </h1>
          <p className="max-w-2xl text-body text-secondary-foreground/80">
            {ELEVE_FR.matieres.description}
          </p>
        </div>
      </header>

      {matieres.length === 0 ? (
        <p className="rounded-xl border p-5 text-muted-foreground">{ELEVE_FR.matieres.vide}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {matieres.map((matiere) => (
            <li key={matiere.id}>
              <Link
                href={`/matieres/${matiere.id}`}
                aria-label={`${ELEVE_FR.matieres.ouvrir} : ${matiere.libelle}`}
                className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <CardTitle className="flex-1 text-lg">{matiere.libelle}</CardTitle>
                    <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    {matiere.description && (
                      <p className="w-full text-body-sm text-muted-foreground">{matiere.description}</p>
                    )}
                    <span className="rounded-full bg-muted px-2.5 py-1 text-body-sm text-muted-foreground">
                      {matiere.nbChapitres}{" "}
                      {accorder(matiere.nbChapitres, ELEVE_FR.matieres.nbChapitre, ELEVE_FR.matieres.nbChapitres)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
