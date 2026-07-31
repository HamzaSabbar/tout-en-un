import { requirePermission } from "@/modules/acces/require-auth";
import { listerOffres } from "@/modules/abonnement/offre";
import { basculerOffreAction } from "@/modules/abonnement/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreerOffreForm } from "./creer-offre-form";

export default async function OffresPage() {
  await requirePermission("abonnements:gerer");
  const offres = await listerOffres();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Offres</h1>
      <CreerOffreForm />
      <ul className="flex flex-col gap-3">
        {offres.map((offre) => (
          <li
            key={offre.id.toString()}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{offre.libelle}</p>
              <p className="text-sm text-muted-foreground">
                {offre.duree_jours} jours — {offre.nb_matieres} matière(s) —{" "}
                {offre.prix.toString()} MAD
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={offre.actif ? "default" : "secondary"}>
                {offre.actif ? "actif" : "inactif"}
              </Badge>
              <form action={basculerOffreAction}>
                <input type="hidden" name="offre_id" value={offre.id.toString()} />
                <input type="hidden" name="actif" value={offre.actif ? "false" : "true"} />
                <Button type="submit" size="sm" variant="outline">
                  {offre.actif ? "Désactiver" : "Activer"}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
