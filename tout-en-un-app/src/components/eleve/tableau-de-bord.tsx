import { BarChart3, CalendarClock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import type { DonneeTableauDeBord } from "@/modules/parcours-eleve/tableau-de-bord";

interface TableauDeBordProps {
  donnees: {
    progression: DonneeTableauDeBord;
    prochainLive: DonneeTableauDeBord;
    derniereNote: DonneeTableauDeBord;
  };
}

const CARTES = [
  {
    cle: "progression",
    titre: ELEVE_FR.tableauDeBord.progression,
    videTexte: ELEVE_FR.tableauDeBord.progressionVide,
    Icone: BarChart3,
  },
  {
    cle: "prochainLive",
    titre: ELEVE_FR.tableauDeBord.prochainLive,
    videTexte: ELEVE_FR.tableauDeBord.prochainLiveVide,
    Icone: CalendarClock,
  },
  {
    cle: "derniereNote",
    titre: ELEVE_FR.tableauDeBord.derniereNote,
    videTexte: ELEVE_FR.tableauDeBord.derniereNoteVide,
    Icone: Trophy,
  },
] as const;

export function TableauDeBord({ donnees }: TableauDeBordProps) {
  return (
    <section aria-labelledby="tableau-de-bord-titre" className="space-y-3">
      <h2 id="tableau-de-bord-titre" className="text-h3 font-semibold">
        {ELEVE_FR.tableauDeBord.titre}
      </h2>
      {/* Les trois cartes tiennent sur une ligne à partir de 1024 px : elles
          sont le résumé de la matière, et un résumé qui se déroule sur trois
          écrans n'en est plus un. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARTES.map(({ cle, titre, videTexte, Icone }) => (
          <Card key={cle} data-dashboard-card={cle}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Icone aria-hidden="true" className="size-4" />
              </span>
              <CardTitle className="text-body-sm">{titre}</CardTitle>
            </CardHeader>
            <CardContent>
              {donnees[cle].etat === "indisponible" && (
                <p className="text-caption text-muted-foreground">{videTexte}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
