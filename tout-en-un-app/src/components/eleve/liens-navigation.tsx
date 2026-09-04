"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, ChevronDown, Home, NotebookPen, Radio } from "lucide-react";
import { SousLiensOngletsCours } from "@/components/eleve/onglets-cours";
import { Badge } from "@/components/ui/badge";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { cn } from "@/lib/utils";

// Liste de liens de la coquille élève, partagée entre la sidebar de bureau et
// le menu mobile : un seul endroit qui décide de ce qui est réellement
// atteignable aujourd'hui.
//
// Live et Résultats n'ont pas encore de page : les afficher comme de vrais
// liens ferait croire à une fonctionnalité qui n'existe pas (lots 6 et 8,
// non construits). Ils restent visibles — l'élève voit où va le produit —
// mais non cliquables, avec un badge « Bientôt ».
const LIENS_REELS = [
  { href: "/compte", label: ELEVE_FR.coquille.accueil, icone: Home },
  { href: "/matieres", label: ELEVE_FR.navigation.matieres, icone: BookOpen },
] as const;

// Un vrai lien, mais volontairement séparé de `LIENS_REELS` par le trait de
// séparation ci-dessous : le carnet n'est pas une entrée de navigation
// principale au même titre que « Mes matières », il doit apparaître un peu
// plus bas.
const LIENS_SECONDAIRES = [
  { href: "/carnet", label: ELEVE_FR.navigation.carnet, icone: NotebookPen },
] as const;

const LIENS_A_VENIR = [
  { label: ELEVE_FR.coquille.live, icone: Radio },
  { label: ELEVE_FR.coquille.resultats, icone: BarChart3 },
] as const;

// Une page de cours a trois sous-sections (vidéos, documents, exercices) :
// sur cette page précise, la sidebar les affiche sous « Mes matières », comme
// un raccourci vers les onglets déjà présents dans le contenu principal (voir
// `onglets-cours.tsx`). Les deux lisent/écrivent le même état, partagé par la
// coquille — jamais de rechargement.
const REGEX_COURS = /^\/matieres\/\d+\/chapitres\/\d+\/cours\/\d+/;

export function LiensNavigation() {
  const pathname = usePathname();
  const surPageDeCours = REGEX_COURS.test(pathname);

  return (
    <nav className="flex flex-col gap-1 p-2 text-sm">
      {LIENS_REELS.map(({ href, label, icone: Icone }) => {
        const actif = href === "/compte" ? pathname === href : pathname.startsWith(href);
        const estMatieresAvecCours = href === "/matieres" && surPageDeCours;
        return (
          <div key={href}>
            <Link
              href={href}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium transition-colors",
                actif ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              <Icone
                aria-hidden="true"
                className={cn("size-5", actif ? "text-primary" : "text-muted-foreground")}
              />
              <span className="flex-1">{label}</span>
              {estMatieresAvecCours && (
                <ChevronDown aria-hidden="true" className="size-4 rotate-180 text-muted-foreground" />
              )}
            </Link>
            {estMatieresAvecCours && (
              <SousLiensOngletsCours className="ml-4 mt-1 flex flex-col gap-0.5 border-l pl-3" />
            )}
          </div>
        );
      })}

      <div className="my-2 border-t" />

      {LIENS_SECONDAIRES.map(({ href, label, icone: Icone }) => {
        const actif = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium transition-colors",
              actif ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            <Icone
              aria-hidden="true"
              className={cn("size-5", actif ? "text-primary" : "text-muted-foreground")}
            />
            <span className="flex-1">{label}</span>
          </Link>
        );
      })}

      {LIENS_A_VENIR.map(({ label, icone: Icone }) => (
        <span
          key={label}
          className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3 font-medium text-muted-foreground/60"
        >
          <Icone aria-hidden="true" className="size-5" />
          <span className="flex-1">{label}</span>
          <Badge variant="secondary" className="pointer-events-none text-muted-foreground">
            {ELEVE_FR.coquille.bientot}
          </Badge>
        </span>
      ))}
    </nav>
  );
}
