import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import { AccesRefuse } from "@/components/acces-refuse";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { ListeChapitres } from "@/components/eleve/liste-chapitres";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirPagePartieEnCache } from "@/modules/parcours-eleve/cache";

interface PartiePageProps {
  params: Promise<{ matiereId: string; partieId: string }>;
}

export default async function PartiePage({ params }: PartiePageProps) {
  const utilisateur = await requireAuth();
  const paramsResolus = await params;
  const matiereId = analyserIdentifiant(paramsResolus.matiereId);
  const partieId = analyserIdentifiant(paramsResolus.partieId);
  if (matiereId === null || partieId === null) notFound();

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), matiereId);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const partie = await obtenirPagePartieEnCache(matiereId, partieId);
  if (!partie) notFound();

  return (
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <Link
        href={`/matieres/${matiereId}`}
        className="inline-flex min-h-11 w-fit items-center text-sm font-medium hover:underline"
      >
        {ELEVE_FR.navigation.retourMatiere}
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-secondary p-6 sm:p-8">
        <Layers
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-40 text-primary/10"
        />
        <div className="relative space-y-2">
          <p className="text-body-sm font-medium text-secondary-foreground/80">{partie.matiere.libelle}</p>
          <h1 className="text-h1 font-bold tracking-tight text-secondary-foreground">{partie.libelle}</h1>
        </div>
      </header>

      <section aria-labelledby="chapitres-titre" className="space-y-3">
        <h2 id="chapitres-titre" className="text-h3 font-semibold">{ELEVE_FR.chapitres.titre}</h2>
        {partie.chapitres.length === 0 ? (
          <p className="text-muted-foreground">{ELEVE_FR.parties.vide}</p>
        ) : (
          <ListeChapitres chapitres={partie.chapitres} matiereId={matiereId.toString()} />
        )}
      </section>
    </div>
  );
}
