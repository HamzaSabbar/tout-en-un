import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

// Rendu à l'intérieur de la coquille élève (sidebar/topbar) : un élève qui
// atteint un lien mort reste dans un produit reconnaissable, jamais sur la
// page 404 générique de Next.
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Compass aria-hidden="true" className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-h2 font-bold tracking-tight">Page introuvable</h1>
        <p className="max-w-sm text-body-sm text-muted-foreground">
          Ce contenu n&apos;existe pas ou n&apos;est plus disponible.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/compte">
          <Button type="button" className="h-11">Retour à l&apos;accueil</Button>
        </Link>
        <Link href="/matieres">
          <Button type="button" variant="outline" className="h-11">Voir mes matières</Button>
        </Link>
      </div>
    </div>
  );
}
