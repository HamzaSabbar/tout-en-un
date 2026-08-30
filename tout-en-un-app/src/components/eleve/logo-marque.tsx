import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

// Logo Tout en Un, réutilisé en haut de la sidebar (bureau) et dans la barre
// du haut (mobile) : un seul endroit qui décide de son rendu.
export function LogoMarque() {
  return (
    <Link href="/matieres" className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap aria-hidden="true" className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-body font-bold tracking-tight">
          {ELEVE_FR.coquille.nomPlateforme}
        </span>
        <span className="hidden text-caption text-muted-foreground sm:block">
          {ELEVE_FR.coquille.slogan}
        </span>
      </span>
    </Link>
  );
}
