import Link from "next/link";
import { requireAnyPermission } from "@/modules/acces/require-auth";
import { hasPermission } from "@/modules/acces/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const utilisateur = await requireAnyPermission(["contenu:gerer", "abonnements:gerer"]);
  const gereContenu = hasPermission(utilisateur.role, "contenu:gerer");
  const gereAbonnements = hasPermission(utilisateur.role, "abonnements:gerer");

  return (
    <div className="min-h-screen">
      <header className="border-b p-4">
        <nav className="flex gap-4 text-sm font-medium">
          {gereContenu && (
            <>
              <Link href="/contenu/matieres">Matières</Link>
              <Link href="/contenu/filieres">Filières</Link>
              <Link href="/contenu/fichiers">Médiathèque</Link>
            </>
          )}
          {gereAbonnements && (
            <>
              <Link href="/abonnements">Demandes</Link>
              <Link href="/abonnements/eleves">Élèves</Link>
              <Link href="/abonnements/offres">Offres</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
