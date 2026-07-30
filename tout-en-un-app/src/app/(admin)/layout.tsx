import Link from "next/link";
import { requirePermission } from "@/modules/acces/require-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("contenu:gerer");

  return (
    <div className="min-h-screen">
      <header className="border-b p-4">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/contenu/matieres">Matières</Link>
          <Link href="/contenu/filieres">Filières</Link>
          <Link href="/contenu/fichiers">Médiathèque</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
