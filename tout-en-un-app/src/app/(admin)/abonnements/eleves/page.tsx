import Link from "next/link";
import { analyserIdentifiant } from "@/lib/identifiant";
import { requirePermission } from "@/modules/acces/require-auth";
import { listerAccesEleve, rechercherEleves } from "@/modules/abonnement/abonnement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivationForm } from "../activation-form";

interface ElevesPageProps {
  searchParams: Promise<{ q?: string; eleve?: string }>;
}

export default async function ElevesPage({ searchParams }: ElevesPageProps) {
  await requirePermission("abonnements:gerer");
  const { q = "", eleve: eleveId } = await searchParams;

  const eleves = await rechercherEleves(q);
  const selectionne = analyserIdentifiant(eleveId);
  const acces = selectionne ? await listerAccesEleve(selectionne) : [];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Élèves et renouvellements</h1>

      <form className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-sm font-medium">
            Rechercher
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Nom, email, téléphone" />
        </div>
        <Button type="submit" variant="outline">
          Chercher
        </Button>
      </form>

      <ul className="flex flex-col gap-2">
        {eleves.map((item) => (
          <li
            key={item.id.toString()}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">
                {item.prenom} {item.nom}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.telephone}
                {item.filiere ? ` — ${item.filiere.libelle}` : ""}
              </p>
            </div>
            <Link
              href={`/abonnements/eleves?q=${encodeURIComponent(q)}&eleve=${item.id}`}
              className="text-sm font-medium hover:underline"
            >
              Voir les accès
            </Link>
          </li>
        ))}
      </ul>

      {selectionne && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Accès en cours</h2>
          {acces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun accès activé pour cet élève.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {acces.map((ligne) => {
                const expire = ligne.date_expiration.getTime() <= Date.now();
                return (
                  <li
                    key={ligne.id.toString()}
                    className="flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{ligne.matiere.libelle}</p>
                        <p className="text-sm text-muted-foreground">
                          Expire le{" "}
                          {ligne.date_expiration.toLocaleDateString("fr-MA")} —
                          abonnement {ligne.abonnement.statut}
                        </p>
                      </div>
                      <Badge variant={expire ? "secondary" : "default"}>
                        {expire ? "expiré" : "actif"}
                      </Badge>
                    </div>
                    <ActivationForm
                      utilisateurId={selectionne.toString()}
                      matiereId={ligne.matiere.id.toString()}
                      offreId={ligne.abonnement.offre.id.toString()}
                      dureeJours={ligne.abonnement.offre.duree_jours}
                      montant={ligne.abonnement.offre.prix.toString()}
                      libelleBouton="Renouveler"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
