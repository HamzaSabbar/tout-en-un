import Link from "next/link";
import { requireAuth } from "@/modules/acces/require-auth";
import { logoutAction } from "@/modules/acces/actions";
import { Button } from "@/components/ui/button";

export default async function ComptePage() {
  const utilisateur = await requireAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <p className="text-lg">Bonjour {utilisateur.prenom}</p>
      <Link href="/demande-acces" className="text-sm font-medium hover:underline">
        Demander l&apos;accès à une matière
      </Link>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}
