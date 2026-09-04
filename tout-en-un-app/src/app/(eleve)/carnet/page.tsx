import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { ListeCarnet } from "@/components/eleve/liste-carnet";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { requireAuth } from "@/modules/acces/require-auth";
import { listerNotes, matieresEtChapitresAvecNotes } from "@/modules/carnet/service";

interface CarnetPageProps {
  searchParams: Promise<{ matiere_id?: string; chapitre_id?: string }>;
}

export default async function CarnetPage({ searchParams }: CarnetPageProps) {
  const utilisateur = await requireAuth();
  const { matiere_id, chapitre_id } = await searchParams;
  const matiereId = analyserIdentifiant(matiere_id) ?? undefined;
  const chapitreId = analyserIdentifiant(chapitre_id) ?? undefined;

  const [options, page] = await Promise.all([
    matieresEtChapitresAvecNotes(BigInt(utilisateur.id)),
    listerNotes(BigInt(utilisateur.id), { matiereId, chapitreId }),
  ]);
  const chapitresFiltres = matiereId
    ? options.chapitres.filter((chapitre) => chapitre.matiereId === matiereId.toString())
    : options.chapitres;

  return (
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-6 py-8`}>
      <header>
        <h1 className="text-h1 font-bold tracking-tight">{ELEVE_FR.carnet.titre}</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">{ELEVE_FR.carnet.description}</p>
      </header>

      {options.matieres.length > 0 && (
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="matiere_id" className="text-body-sm font-medium">
              {ELEVE_FR.carnet.filtreMatiere}
            </label>
            <select
              id="matiere_id"
              name="matiere_id"
              defaultValue={matiere_id ?? ""}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">{ELEVE_FR.carnet.toutesMatieres}</option>
              {options.matieres.map((matiere) => (
                <option key={matiere.id} value={matiere.id}>
                  {matiere.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="chapitre_id" className="text-body-sm font-medium">
              {ELEVE_FR.carnet.filtreChapitre}
            </label>
            <select
              id="chapitre_id"
              name="chapitre_id"
              defaultValue={chapitre_id ?? ""}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">{ELEVE_FR.carnet.tousChapitres}</option>
              {chapitresFiltres.map((chapitre) => (
                <option key={chapitre.id} value={chapitre.id}>
                  {chapitre.libelle}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg border border-input px-3 text-sm font-medium hover:bg-muted"
          >
            {ELEVE_FR.carnet.filtrer}
          </button>
        </form>
      )}

      <ListeCarnet
        notesInitiales={page.notes}
        curseurInitial={page.curseurSuivant}
        matiereId={matiere_id}
        chapitreId={chapitre_id}
      />
    </div>
  );
}
