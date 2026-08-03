import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { requireAuth } from "@/modules/acces/require-auth";
import { listerMatieresPourEleve } from "@/modules/parcours-eleve/service";

export default async function MatieresPage() {
  const utilisateur = await requireAuth();
  const matieres = await listerMatieresPourEleve(BigInt(utilisateur.id));

  return (
    <main className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-6 py-8`}>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{ELEVE_FR.matieres.titre}</h1>
        <p className="text-base text-muted-foreground">{ELEVE_FR.matieres.description}</p>
      </header>

      {matieres.length === 0 ? (
        <p className="rounded-xl border p-5 text-muted-foreground">{ELEVE_FR.matieres.vide}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {matieres.map((matiere) => (
            <li key={matiere.id.toString()}>
              <Link
                href={`/matieres/${matiere.id}`}
                aria-label={`${ELEVE_FR.matieres.ouvrir} : ${matiere.libelle}`}
                className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <CardTitle className="flex-1 text-lg">{matiere.libelle}</CardTitle>
                    <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                  </CardHeader>
                  {matiere.description && (
                    <CardContent className="text-sm text-muted-foreground">
                      {matiere.description}
                    </CardContent>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
