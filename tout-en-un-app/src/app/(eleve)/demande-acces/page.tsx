import { UserPlus } from "lucide-react";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { Card, CardContent } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
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
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <header className="relative overflow-hidden rounded-2xl bg-secondary p-6 sm:p-8">
        <UserPlus
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-40 text-primary/10"
        />
        <div className="relative space-y-2">
          <h1 className="text-h1 font-bold tracking-tight text-secondary-foreground">
            {ELEVE_FR.demandeAcces.titre}
          </h1>
          <p className="max-w-2xl text-body text-secondary-foreground/80">
            {filiere
              ? `Filière ${filiere.libelle}. ${ELEVE_FR.demandeAcces.filiereIntro}`
              : ELEVE_FR.demandeAcces.sansFiliere}
          </p>
        </div>
      </header>

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {demandes.length > 0 && (
        <section className="max-w-2xl space-y-3">
          <h2 className="text-h3 font-semibold">{ELEVE_FR.demandeAcces.mesDemandes}</h2>
          <ul className="space-y-2">
            {demandes.map((demande) => (
              <li key={demande.id.toString()}>
                <Card>
                  <CardContent className="flex items-center justify-between gap-3 pt-6 text-body-sm">
                    <span className="font-medium">{demande.matiere.libelle}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                      {demande.statut}
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
