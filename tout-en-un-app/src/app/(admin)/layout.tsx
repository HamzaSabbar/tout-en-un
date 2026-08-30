import { GraduationCap, LogOut, Menu } from "lucide-react";
import { requireAnyPermission } from "@/modules/acces/require-auth";
import { hasPermission } from "@/modules/acces/permissions";
import { logoutAction } from "@/modules/acces/actions";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { ADMIN_FR } from "@/lib/i18n/admin.fr";

// Coquille du back-office, alignée sur celle de l'espace élève
// ((eleve)/layout.tsx) : sidebar de bureau (logo, navigation, compte), barre
// du haut sur mobile. Chaque page garde son propre contrôle d'accès via
// `requirePermission()` : la coquille n'affiche que la navigation autorisée,
// elle ne dispense aucune page de vérifier elle-même la permission requise.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const utilisateur = await requireAnyPermission(["contenu:gerer", "abonnements:gerer"]);
  const gereContenu = hasPermission(utilisateur.role, "contenu:gerer");
  const gereAbonnements = hasPermission(utilisateur.role, "abonnements:gerer");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap aria-hidden="true" className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-body font-bold tracking-tight">
              {ADMIN_FR.coquille.nomPlateforme}
            </span>
            <span className="block text-caption text-muted-foreground">
              {ADMIN_FR.coquille.espaceAdmin}
            </span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AdminNav gereContenu={gereContenu} gereAbonnements={gereAbonnements} />
        </div>

        <div className="border-t p-3">
          <p className="truncate text-body-sm font-medium">
            {utilisateur.prenom} {utilisateur.nom}
          </p>
          <p className="truncate text-caption text-muted-foreground">{utilisateur.email}</p>
          <form action={logoutAction} className="mt-2">
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
              <LogOut aria-hidden="true" className="size-4" />
              {ADMIN_FR.coquille.seDeconnecter}
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-16 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <details>
            <summary
              aria-label={ADMIN_FR.coquille.ouvrirMenu}
              className="flex size-9 list-none items-center justify-center rounded-md hover:bg-muted"
            >
              <Menu aria-hidden="true" className="size-5" />
            </summary>
            <div className="absolute left-0 top-16 z-20 w-72 max-w-[85vw] border-r bg-card shadow-lg">
              <AdminNav gereContenu={gereContenu} gereAbonnements={gereAbonnements} />
              <form action={logoutAction} className="border-t p-3">
                <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <LogOut aria-hidden="true" className="size-4" />
                  {ADMIN_FR.coquille.seDeconnecter}
                </Button>
              </form>
            </div>
          </details>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap aria-hidden="true" className="size-4" />
          </span>
          <span className="text-sm font-bold">{ADMIN_FR.coquille.nomPlateforme}</span>
        </header>

        <main className="min-w-0 flex-1 p-6">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
