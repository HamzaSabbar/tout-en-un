"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { creerDemandeAction, type ActionState } from "@/modules/abonnement/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

const initialState: ActionState = {};

export interface OptionMatiere {
  id: string;
  libelle: string;
}

export interface OptionOffre {
  id: string;
  libelle: string;
  duree_jours: number;
  nb_matieres: number;
  prix: string;
}

export function DemandeAccesForm({
  matieres,
  offres,
}: {
  matieres: OptionMatiere[];
  offres: OptionOffre[];
}) {
  const [state, formAction, pending] = useActionState(creerDemandeAction, initialState);

  if (state.succes) {
    return (
      <p className="animate-in fade-in-0 flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/10 p-4 text-body-sm text-success duration-200">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {ELEVE_FR.demandeAcces.succes}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{ELEVE_FR.demandeAcces.matieresSouhaitees}</legend>
        {matieres.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{ELEVE_FR.demandeAcces.aucuneMatiere}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {matieres.map((matiere) => (
              <label
                key={matiere.id}
                className="flex min-h-11 items-center gap-2.5 rounded-lg border px-3 text-body-sm transition-colors hover:bg-muted/50"
              >
                <input type="checkbox" name="matiere_ids" value={matiere.id} />
                {matiere.libelle}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{ELEVE_FR.demandeAcces.offre}</legend>
        {offres.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{ELEVE_FR.demandeAcces.aucuneOffre}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {offres.map((offre) => (
              <label
                key={offre.id}
                className="flex min-h-11 items-center gap-2.5 rounded-lg border px-3 text-body-sm transition-colors hover:bg-muted/50"
              >
                <input type="radio" name="offre_id" value={offre.id} required />
                <span>
                  {offre.libelle} — {offre.duree_jours} {ELEVE_FR.demandeAcces.joursUnite},{" "}
                  {offre.nb_matieres} {ELEVE_FR.demandeAcces.matiereUnite}, {offre.prix} MAD
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">{ELEVE_FR.demandeAcces.message}</Label>
        <Input id="message" name="message" maxLength={500} />
      </div>

      {state.erreur && <p className="text-body-sm text-destructive">{state.erreur}</p>}

      <Button
        type="submit"
        className="min-h-11"
        disabled={pending || matieres.length === 0 || offres.length === 0}
      >
        {ELEVE_FR.demandeAcces.envoyer}
      </Button>
    </form>
  );
}
