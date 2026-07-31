import { notFound } from "next/navigation";
import { analyserIdentifiant } from "@/lib/identifiant";
import { requireAuth } from "@/modules/acces/require-auth";
import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { listerChapitresPublies } from "@/modules/contenu/chapitre";
import { obtenirMatiere } from "@/modules/contenu/matiere";
import { AccesRefuse } from "@/components/acces-refuse";

interface MatierePageProps {
  params: Promise<{ matiereId: string }>;
}

export default async function MatierePage({ params }: MatierePageProps) {
  const utilisateur = await requireAuth();
  const { matiereId } = await params;

  const id = analyserIdentifiant(matiereId);
  if (id === null) {
    notFound();
  }

  const acces = await verifierAccesMatiere(BigInt(utilisateur.id), id);
  if (!acces.autorise) {
    // Aucune requête de contenu n'est exécutée : le contenu non autorisé ne
    // quitte pas le serveur, il n'est pas seulement masqué (invariant 2).
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const [matiere, chapitres] = await Promise.all([
    obtenirMatiere(id),
    listerChapitresPublies(id),
  ]);
  if (!matiere) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{matiere.libelle}</h1>
      {chapitres.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun chapitre publié pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {chapitres.map((chapitre) => (
            <li key={chapitre.id.toString()} className="rounded-lg border p-4">
              <p className="font-medium">{chapitre.libelle}</p>
              {chapitre.description && (
                <p className="text-sm text-muted-foreground">{chapitre.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
