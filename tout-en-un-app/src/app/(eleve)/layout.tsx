import { BarreNavigation } from "@/components/eleve/barre-navigation";
import { LiensNavigation } from "@/components/eleve/liens-navigation";
import { LogoMarque } from "@/components/eleve/logo-marque";
import { MenuCompte } from "@/components/eleve/menu-compte";
import { FournisseurOngletsCours } from "@/components/eleve/onglets-cours";
import { requireAuth } from "@/modules/acces/require-auth";

// Coquille permanente de l'espace élève : sidebar sur grand écran (logo,
// navigation, compte), barre du haut sur mobile/tablette. Chaque page garde
// son propre `requireAuth()` (et, pour celles qui touchent une matière, son
// propre `verifierAccesMatiere()`) : la coquille affiche la navigation, elle
// ne dispense aucune page de vérifier elle-même l'accès à sa ressource.
export default async function EleveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const utilisateur = await requireAuth();

  return (
    <FournisseurOngletsCours>
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="px-4 py-4">
            <LogoMarque />
          </div>
          <div className="flex-1 overflow-y-auto">
            <LiensNavigation />
          </div>
          <div className="border-t p-2">
            <MenuCompte utilisateur={utilisateur} variant="sidebar" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <BarreNavigation utilisateur={utilisateur} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </FournisseurOngletsCours>
  );
}
