import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AccesRefuse } from "@/components/acces-refuse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirPageChapitreEnCache } from "@/modules/parcours-eleve/cache";

interface ChapitrePageProps {
  params: Promise<{ matiereId: string; chapitreId: string }>;
}

export default async function ChapitrePage({ params }: ChapitrePageProps) {
  const utilisateur = await requireAuth();
  const paramsResolus = await params;
  const matiereId = analyserIdentifiant(paramsResolus.matiereId);
  const chapitreId = analyserIdentifiant(paramsResolus.chapitreId);
  if (matiereId === null || chapitreId === null) notFound();

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const chapitre = await obtenirPageChapitreEnCache(matiereId, chapitreId);
  if (!chapitre) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <Link href={`/matieres/${matiereId}`} className="inline-flex min-h-11 items-center text-sm font-medium hover:underline">
          {ELEVE_FR.navigation.retourMatiere}
        </Link>
        <p className="text-sm text-muted-foreground">{chapitre.matiere.libelle}</p>
        <h1 className="text-3xl font-bold tracking-tight">{chapitre.libelle}</h1>
        {chapitre.description && <p className="text-muted-foreground">{chapitre.description}</p>}
      </header>

      <section aria-labelledby="cours-titre" className="space-y-3">
        <h2 id="cours-titre" className="text-xl font-semibold">{ELEVE_FR.cours.titre}</h2>
        {chapitre.cours.length === 0 ? (
          <p className="text-muted-foreground">{ELEVE_FR.cours.vide}</p>
        ) : (
          <ul className="space-y-3">
            {chapitre.cours.map((cours) => (
              <li key={cours.id.toString()}>
                <Link
                  href={`/matieres/${matiereId}/chapitres/${chapitre.id}/cours/${cours.id}`}
                  className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <CardTitle className="flex-1 text-base">{cours.titre}</CardTitle>
                      <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                    </CardHeader>
                    {cours.description && <CardContent className="text-sm text-muted-foreground">{cours.description}</CardContent>}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
