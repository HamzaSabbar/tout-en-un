import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AccesRefuse } from "@/components/acces-refuse";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { TableauDeBord } from "@/components/eleve/tableau-de-bord";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirPageMatiereEnCache } from "@/modules/parcours-eleve/cache";
import { obtenirTableauDeBord } from "@/modules/parcours-eleve/tableau-de-bord";

interface MatierePageProps {
  params: Promise<{ matiereId: string }>;
}

export default async function MatierePage({ params }: MatierePageProps) {
  const utilisateur = await requireAuth();
  const { matiereId } = await params;
  const id = analyserIdentifiant(matiereId);
  if (id === null) notFound();

  const utilisateurId = BigInt(utilisateur.id);
  const acces = await verifierAccesMatiere(utilisateurId, id);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const [matiere, tableauDeBord] = await Promise.all([
    obtenirPageMatiereEnCache(id),
    obtenirTableauDeBord(utilisateurId, id),
  ]);
  if (!matiere) notFound();

  return (
    <main className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <header className="space-y-3">
        <Link href="/matieres" className="inline-flex min-h-11 items-center text-sm font-medium hover:underline">
          {ELEVE_FR.navigation.retourMatieres}
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{matiere.libelle}</h1>
          {matiere.description && <p className="text-muted-foreground">{matiere.description}</p>}
        </div>
      </header>

      <TableauDeBord donnees={tableauDeBord} />

      <section aria-labelledby="chapitres-titre" className="space-y-3">
        <h2 id="chapitres-titre" className="text-xl font-semibold">{ELEVE_FR.chapitres.titre}</h2>
        {matiere.chapitres.length === 0 ? (
          <p className="text-muted-foreground">{ELEVE_FR.chapitres.vide}</p>
        ) : (
          // Grille plutôt qu'empilement : une matière compte une dizaine de
          // chapitres, et sur grand écran la colonne unique ne remplissait rien.
          <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {matiere.chapitres.map((chapitre) => (
              <li key={chapitre.id.toString()}>
                <Link
                  href={`/matieres/${matiere.id}/chapitres/${chapitre.id}`}
                  className="block min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <CardTitle className="flex-1 text-base">{chapitre.libelle}</CardTitle>
                      <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                    </CardHeader>
                    {chapitre.description && <CardContent className="text-sm text-muted-foreground">{chapitre.description}</CardContent>}
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
