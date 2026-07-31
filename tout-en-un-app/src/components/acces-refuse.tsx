import Link from "next/link";
import type { MotifAcces } from "@/modules/acces/acces-matiere";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Le motif conditionne l'écran : c'est ce qui distingue une invitation à
// s'abonner d'une invitation à renouveler (architecture, section 6).
const ECRANS: Record<
  Exclude<MotifAcces, "ok">,
  { titre: string; description: string; lien?: { href: string; libelle: string } }
> = {
  non_souscrit: {
    titre: "Cette matière n'est pas encore dans ton abonnement",
    description:
      "Demande l'accès en choisissant une offre. Nous te contactons par téléphone pour finaliser.",
    lien: { href: "/demande-acces", libelle: "Demander l'accès" },
  },
  expire: {
    titre: "Ton accès à cette matière a expiré",
    description:
      "Renouvelle pour retrouver tes cours, tes vidéos et tes exercices là où tu les avais laissés.",
    lien: { href: "/demande-acces", libelle: "Renouveler" },
  },
  hors_filiere: {
    titre: "Cette matière ne concerne pas ta filière",
    description:
      "Seules les matières de ta filière sont disponibles. Contacte-nous si ta filière est incorrecte.",
  },
};

export function AccesRefuse({ motif }: { motif: Exclude<MotifAcces, "ok"> }) {
  const ecran = ECRANS[motif];

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md" data-motif={motif}>
        <CardHeader>
          <CardTitle>{ecran.titre}</CardTitle>
          <CardDescription>{ecran.description}</CardDescription>
        </CardHeader>
        {ecran.lien && (
          <CardContent>
            <Link href={ecran.lien.href} className={buttonVariants()}>
              {ecran.lien.libelle}
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
