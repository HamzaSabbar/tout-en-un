import { Menu } from "lucide-react";
import { LiensNavigation } from "@/components/eleve/liens-navigation";
import { LogoMarque } from "@/components/eleve/logo-marque";
import { MenuCompte } from "@/components/eleve/menu-compte";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import type { UtilisateurSafe } from "@/lib/auth/current-user";

// Barre du haut : visible uniquement sur mobile/tablette (`lg:hidden`), là où
// la sidebar de bureau est masquée. Sur grand écran, la navigation et le
// compte vivent dans la sidebar (voir `(eleve)/layout.tsx`) : dupliquer
// l'avatar dans les deux endroits n'apporterait rien.
export function BarreNavigation({ utilisateur }: { utilisateur: UtilisateurSafe }) {
  return (
    <header className="relative border-b bg-card lg:hidden">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        <details>
          <summary
            aria-label={ELEVE_FR.coquille.ouvrirMenu}
            className="flex size-9 list-none items-center justify-center rounded-md hover:bg-muted"
          >
            <Menu aria-hidden="true" className="size-5" />
          </summary>
          <div className="absolute left-0 top-16 z-20 w-72 max-w-[85vw] border-r bg-card shadow-lg">
            <LiensNavigation />
          </div>
        </details>

        <LogoMarque />

        <div className="flex-1" />

        <MenuCompte utilisateur={utilisateur} variant="topbar" />
      </div>
    </header>
  );
}
