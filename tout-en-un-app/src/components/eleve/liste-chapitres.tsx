import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { accorder } from "@/lib/pluriel";

interface ChapitreCarte {
  id: string;
  libelle: string;
  description: string | null;
  nbCours: number;
  nbExercices: number;
}

// Partagé entre la page matière (matières sans partie) et la page partie
// (matières avec parties, ex. Physique-Chimie) : même carte de chapitre dans
// les deux cas, seul ce qui l'entoure change.
export function ListeChapitres({
  chapitres,
  matiereId,
}: {
  chapitres: ChapitreCarte[];
  matiereId: string;
}) {
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
