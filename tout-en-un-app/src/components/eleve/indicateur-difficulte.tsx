import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { cn } from "@/lib/utils";

// Remplace l'ancien rating à cinq étoiles (trop proche d'un avis client) par
// un indicateur explicite : points de progression + libellé Facile/Moyen/
// Difficile. La note reste fixée par le professeur à la création, l'élève ne
// la modifie pas.
const PALIERS = [
  { seuil: 2, libelle: ELEVE_FR.exercice.difficulteFacile, classe: "bg-success/10 text-success" },
  { seuil: 3, libelle: ELEVE_FR.exercice.difficulteMoyen, classe: "bg-warning/10 text-warning" },
  { seuil: 5, libelle: ELEVE_FR.exercice.difficulteDifficile, classe: "bg-destructive/10 text-destructive" },
] as const;

function resoudrePalier(valeur: number) {
  return PALIERS.find((palier) => valeur <= palier.seuil) ?? PALIERS[PALIERS.length - 1];
}

export function IndicateurDifficulte({ valeur }: { valeur: number }) {
  const palier = resoudrePalier(valeur);

  return (
    <div
      role="img"
      aria-label={`${ELEVE_FR.exercice.difficulte} : ${palier.libelle}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-caption font-medium",
        palier.classe,
      )}
    >
      <span aria-hidden="true" className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={cn("size-1.5 rounded-full", index < valeur ? "bg-current" : "bg-current/25")}
          />
        ))}
      </span>
      {palier.libelle}
    </div>
  );
}
