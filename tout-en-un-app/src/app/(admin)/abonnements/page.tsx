import { requirePermission } from "@/modules/acces/require-auth";
import { listerDemandesEnAttente } from "@/modules/abonnement/demande";
import { refuserDemandeAction } from "@/modules/abonnement/actions";
import { Button } from "@/components/ui/button";
import { ActivationForm } from "./activation-form";

export default async function DemandesPage() {
  await requirePermission("abonnements:gerer");
  const demandes = await listerDemandesEnAttente();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Demandes d&apos;accès</h1>
        <p className="text-sm text-muted-foreground">
          Contacte l&apos;élève, encaisse, puis active la matière.
        </p>
      </div>

      {demandes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {demandes.map((demande) => (
            <li
              key={demande.id.toString()}
              className="flex flex-col gap-4 rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {demande.utilisateur.prenom} {demande.utilisateur.nom}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {demande.utilisateur.telephone}
                    {demande.utilisateur.filiere
                      ? ` — ${demande.utilisateur.filiere.libelle}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    {demande.matiere.libelle} — {demande.abonnement.offre.libelle} (
                    {demande.abonnement.offre.duree_jours} jours,{" "}
                    {demande.abonnement.offre.prix.toString()} MAD)
                  </p>
                  {demande.message && (
                    <p className="mt-1 text-sm italic text-muted-foreground">
                      « {demande.message} »
                    </p>
                  )}
                </div>
                <form action={refuserDemandeAction}>
                  <input
                    type="hidden"
                    name="demande_id"
                    value={demande.id.toString()}
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Refuser
                  </Button>
                </form>
              </div>

              <ActivationForm
                utilisateurId={demande.utilisateur.id.toString()}
                matiereId={demande.matiere.id.toString()}
                offreId={demande.abonnement.offre.id.toString()}
                dureeJours={demande.abonnement.offre.duree_jours}
                montant={demande.abonnement.montant.toString()}
                demandeId={demande.id.toString()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
