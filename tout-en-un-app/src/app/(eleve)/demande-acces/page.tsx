import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirFiliereEleve } from "@/modules/acces/acces-matiere";
import { listerMatieresDeFiliere } from "@/modules/contenu/matiere";
import { listerOffresActives } from "@/modules/abonnement/offre";
import { listerDemandesEleve } from "@/modules/abonnement/demande";
import { DemandeAccesForm } from "./demande-acces-form";

export default async function DemandeAccesPage() {
  const utilisateur = await requireAuth();
  const utilisateurId = BigInt(utilisateur.id);

  const filiere = await obtenirFiliereEleve(utilisateurId);
  const [matieres, offres, demandes] = await Promise.all([
    filiere ? listerMatieresDeFiliere(filiere.id) : Promise.resolve([]),
    listerOffresActives(),
    listerDemandesEleve(utilisateurId),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Demander l&apos;accès à une matière</h1>
        <p className="text-sm text-muted-foreground">
          {filiere
            ? `Filière ${filiere.libelle}. Le paiement se fait hors ligne, nous te contactons par téléphone.`
            : "Aucune filière n'est associée à ton compte. Contacte-nous pour la corriger."}
        </p>
      </div>

      <DemandeAccesForm
        matieres={matieres.map((matiere) => ({
          id: matiere.id.toString(),
          libelle: matiere.libelle,
        }))}
        offres={offres.map((offre) => ({
          id: offre.id.toString(),
          libelle: offre.libelle,
          duree_jours: offre.duree_jours,
          nb_matieres: offre.nb_matieres,
          prix: offre.prix.toString(),
        }))}
      />

      {demandes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Mes demandes</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {demandes.map((demande) => (
              <li
                key={demande.id.toString()}
                className="flex justify-between rounded-lg border p-3"
              >
                <span>{demande.matiere.libelle}</span>
                <span className="text-muted-foreground">{demande.statut}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
