import Link from "next/link";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/modules/acces/actions";
import type { UtilisateurSafe } from "@/lib/auth/current-user";

interface MenuCompteProps {
  utilisateur: UtilisateurSafe;
  // "sidebar" : ligne pleine largeur (avatar + nom + email), panneau vers le
  // haut, utilisée en bas de la sidebar de bureau.
  // "topbar" : avatar seul, panneau vers le bas, utilisée dans la barre du
  // haut mobile (la sidebar y est masquée).
  variant: "sidebar" | "topbar";
}

// Menu compte, partagé entre la sidebar (bureau) et la barre du haut
// (mobile) : même contenu (lien « Mon compte », déconnexion), seule la
// disposition change. `<details>` : zéro JavaScript ajouté au budget.
export function MenuCompte({ utilisateur, variant }: MenuCompteProps) {
  const initiales = `${utilisateur.prenom[0] ?? ""}${utilisateur.nom[0] ?? ""}`.toUpperCase();
  const estSidebar = variant === "sidebar";

  return (
    <details className="group relative">
      <summary
        aria-label={ELEVE_FR.coquille.ouvrirMenuCompte}
        className={cn(
          "flex min-h-11 list-none cursor-pointer items-center gap-2.5 rounded-lg px-2 hover:bg-muted",
          estSidebar ? "w-full" : "rounded-full",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-label text-primary-foreground">
          {initiales || <User aria-hidden="true" className="size-4" />}
        </span>
        {estSidebar && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-body-sm font-medium">
              {utilisateur.prenom} {utilisateur.nom}
            </span>
            <span className="block truncate text-caption text-muted-foreground">
              {utilisateur.email}
            </span>
          </span>
        )}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </summary>
      <div
        className={cn(
          "absolute z-20 w-56 rounded-lg border bg-popover p-1.5 text-sm shadow-lg",
          estSidebar ? "inset-x-0 bottom-full mb-2" : "right-0 top-full mt-2",
        )}
      >
        {!estSidebar && (
          <p className="truncate px-2.5 py-1.5 text-muted-foreground">{utilisateur.email}</p>
        )}
        <Link
          href="/compte"
          className="flex min-h-11 items-center gap-2.5 rounded-md px-2.5 font-medium hover:bg-muted"
        >
          <User aria-hidden="true" className="size-4" />
          {ELEVE_FR.coquille.monCompte}
        </Link>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="flex min-h-11 w-full items-center justify-start gap-2.5 px-2.5 font-medium"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {ELEVE_FR.coquille.seDeconnecter}
          </Button>
        </form>
      </div>
    </details>
  );
}
