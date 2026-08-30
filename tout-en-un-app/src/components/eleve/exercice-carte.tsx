"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { IndicateurDifficulte } from "@/components/eleve/indicateur-difficulte";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

interface ExerciceCarteProps {
  titre: string;
  difficulte: number;
  children: ReactNode;
}

// Coquille pliable d'un exercice : titre et étoiles toujours visibles, le
// reste (énoncé, aide, correction, auto-évaluation) replié d'un clic. Un
// cours à vingt exercices devient parcourable sans être un long défilement.
export function ExerciceCarte({ titre, difficulte, children }: ExerciceCarteProps) {
  const [ouvert, setOuvert] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{titre}</CardTitle>
        <IndicateurDifficulte valeur={difficulte} />
        <CardAction>
          <button
            type="button"
            aria-expanded={ouvert}
            aria-label={ouvert ? ELEVE_FR.exercice.reduireExercice : ELEVE_FR.exercice.agrandirExercice}
            onClick={() => setOuvert((valeur) => !valeur)}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-5 transition-transform ${ouvert ? "rotate-180" : ""}`}
            />
          </button>
        </CardAction>
      </CardHeader>
      {ouvert && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  );
}
