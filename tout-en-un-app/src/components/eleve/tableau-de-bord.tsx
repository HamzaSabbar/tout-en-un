import { BarChart3, CalendarClock, GraduationCap, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import type { DonneeTableauDeBord } from "@/modules/parcours-eleve/tableau-de-bord";

interface TableauDeBordProps {
  donnees: {
    progression: DonneeTableauDeBord;
    prochainLive: DonneeTableauDeBord;
    derniereNote: DonneeTableauDeBord;
    dateNational: DonneeTableauDeBord;
  };
}

const CARTES = [
  { cle: "progression", titre: ELEVE_FR.tableauDeBord.progression, Icone: BarChart3 },
  { cle: "prochainLive", titre: ELEVE_FR.tableauDeBord.prochainLive, Icone: CalendarClock },
  { cle: "derniereNote", titre: ELEVE_FR.tableauDeBord.derniereNote, Icone: Trophy },
  { cle: "dateNational", titre: ELEVE_FR.tableauDeBord.national, Icone: GraduationCap },
] as const;

export function TableauDeBord({ donnees }: TableauDeBordProps) {
  return (
    <section aria-labelledby="tableau-de-bord-titre" className="space-y-3">
      <h2 id="tableau-de-bord-titre" className="text-xl font-semibold">
        {ELEVE_FR.tableauDeBord.titre}
      </h2>
      {/* Les quatre cartes tiennent sur une ligne à partir de 1024 px : elles
          sont le résumé de la matière, et un résumé qui se déroule sur quatre
          écrans n'en est plus un. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARTES.map(({ cle, titre, Icone }) => (
          <Card key={cle} data-dashboard-card={cle}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Icone aria-hidden="true" className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">{titre}</CardTitle>
            </CardHeader>
            <CardContent>
              {donnees[cle].etat === "indisponible" && (
                <p className="text-sm text-muted-foreground">
                  {ELEVE_FR.tableauDeBord.indisponible}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
