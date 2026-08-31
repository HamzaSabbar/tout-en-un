import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { accorder } from "@/lib/pluriel";
import type { CompteARebours as CompteAReboursDonnees } from "@/modules/parcours-eleve/compte-a-rebours";

export function CompteARebours({ donnees }: { donnees: CompteAReboursDonnees }) {
  return (
    <section aria-labelledby="compte-a-rebours-titre" className="space-y-3">
      <h2 id="compte-a-rebours-titre" className="text-h3 font-semibold">
        {ELEVE_FR.compteARebours.titre}
      </h2>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <GraduationCap aria-hidden="true" className="size-4" />
          </span>
          {donnees.etat === "disponible" && (
            <CardTitle className="text-body-sm">{donnees.libelle}</CardTitle>
          )}
        </CardHeader>
        <CardContent>
          {donnees.etat === "disponible" ? (
            <p>
              <span className="text-h2 font-bold text-primary">{donnees.joursRestants}</span>{" "}
              <span className="text-body-sm text-muted-foreground">
                {accorder(donnees.joursRestants, ELEVE_FR.compteARebours.jour, ELEVE_FR.compteARebours.jours)}
              </span>
            </p>
          ) : (
            <p className="text-caption text-muted-foreground">{ELEVE_FR.compteARebours.vide}</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
