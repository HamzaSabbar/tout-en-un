"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { cn } from "@/lib/utils";

export type OngletCours = "videos" | "documents" | "exercices" | "extraits";

export const ONGLETS_COURS: { cle: OngletCours; label: string }[] = [
  { cle: "videos", label: ELEVE_FR.ressources.videos },
  { cle: "documents", label: ELEVE_FR.ressources.documents },
  { cle: "exercices", label: ELEVE_FR.ressources.exercices },
  { cle: "extraits", label: ELEVE_FR.ressources.extraitsNationaux },
];

const REGEX_COURS = /^\/matieres\/\d+\/chapitres\/\d+\/cours\/(\d+)/;

interface ValeurContexte {
  onglet: OngletCours;
  choisir: (onglet: OngletCours) => void;
}

const ContexteOnglets = createContext<ValeurContexte | null>(null);

// État de l'onglet actif (vidéos / documents / exercices), en mémoire
// seulement — jamais dans l'URL. Un aller-retour serveur par clic (même une
// simple mise à jour de recherche) s'est révélé peu fiable sur un cours
// chargé (beaucoup de vidéos) : la requête RSC pouvait être annulée sous
// contention réseau, laissant l'onglet inchangé sans erreur visible. Un état
// client pur élimine la requête, donc le risque.
//
// Porté par la coquille (`(eleve)/layout.tsx`) : la sidebar et le contenu de
// la page de cours sont deux sous-arbres distincts qui doivent lire/écrire le
// même onglet.
export function FournisseurOngletsCours({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const coursId = pathname.match(REGEX_COURS)?.[1] ?? null;
  const [onglet, setOnglet] = useState<OngletCours>("videos");
  const [coursIdConnu, setCoursIdConnu] = useState(coursId);

  // Changement de cours (ou sortie d'un cours) : revient à « Vidéos » plutôt
  // que de garder l'onglet du cours précédent. Mise à jour pendant le rendu
  // (motif React officiel de réinitialisation sur changement de clé), pas un
  // effet : sans quoi le premier rendu du nouveau cours afficherait un
  // instant l'ancien onglet.
  if (coursId !== coursIdConnu) {
    setCoursIdConnu(coursId);
    setOnglet("videos");
  }

  return (
    <ContexteOnglets.Provider value={{ onglet, choisir: setOnglet }}>
      {children}
    </ContexteOnglets.Provider>
  );
}

function useOngletsCours() {
  const contexte = useContext(ContexteOnglets);
  if (!contexte) {
    throw new Error("useOngletsCours doit être utilisé sous FournisseurOngletsCours");
  }
  return contexte;
}

// Sous-liens de la sidebar (« Mes matières » > Vidéos/Documents/Exercices),
// visibles uniquement sur une page de cours — voir `liens-navigation.tsx`.
export function SousLiensOngletsCours({ className }: { className?: string }) {
  const { onglet, choisir } = useOngletsCours();
  return (
    <div className={className}>
      {ONGLETS_COURS.map(({ cle, label }) => (
        <button
          key={cle}
          type="button"
          onClick={() => choisir(cle)}
          aria-current={onglet === cle ? "page" : undefined}
          className={cn(
            "flex min-h-9 w-full items-center rounded-md px-2.5 text-left text-body-sm transition-colors",
            onglet === cle
              ? "bg-secondary font-medium text-secondary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function BarreOngletsCours() {
  const { onglet, choisir } = useOngletsCours();

  return (
    // `overflow-x-auto` + `shrink-0` : un 4ᵉ onglet (Nationaux) peut dépasser
    // 375 px selon les libellés — la barre défile plutôt que de faire déborder
    // toute la page (invariant du lot 3, vérifié à 375 px).
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b">
      {ONGLETS_COURS.map(({ cle, label }) => (
        <button
          key={cle}
          type="button"
          role="tab"
          aria-selected={onglet === cle}
          onClick={() => choisir(cle)}
          className={cn(
            "-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 text-body-sm font-medium whitespace-nowrap transition-colors",
            onglet === cle
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Démonté, pas seulement masqué, quand l'onglet n'est pas actif : un exercice
// affiché en `hidden` resterait tout de même monté, et déclencherait quand
// même son `MarqueurEtape` (« vue » sur simple montage, voir ce composant) —
// une vue enregistrée pour un onglet que l'élève n'a jamais ouvert. Les
// données des trois onglets viennent d'un seul appel côté service, donc
// démonter/remonter ne coûte aucun aller-retour réseau, seulement le
// remontage React de données déjà en mémoire.
export function PanneauOnglet({ cle, children }: { cle: OngletCours; children: ReactNode }) {
  const { onglet } = useOngletsCours();
  if (onglet !== cle) return null;

  return (
    <div role="tabpanel" className="space-y-4">
      {children}
    </div>
  );
}
