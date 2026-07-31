"use client";

import { useActionState } from "react";
import { creerDemandeAction, type ActionState } from "@/modules/abonnement/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <p className="rounded-lg border border-green-600/40 bg-green-50 p-4 text-sm">
        Ta demande est enregistrée. Nous te contactons par téléphone pour finaliser
        l&apos;activation.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Matières souhaitées</legend>
        {matieres.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune matière n&apos;est disponible pour ta filière pour le moment.
          </p>
        ) : (
          matieres.map((matiere) => (
            <label key={matiere.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="matiere_ids" value={matiere.id} />
              {matiere.libelle}
            </label>
          ))
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Offre</legend>
        {offres.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune offre n&apos;est disponible pour le moment.
          </p>
        ) : (
          offres.map((offre) => (
            <label key={offre.id} className="flex items-center gap-2 text-sm">
              <input type="radio" name="offre_id" value={offre.id} required />
              {offre.libelle} — {offre.duree_jours} jours, {offre.nb_matieres} matière(s),{" "}
              {offre.prix} MAD
            </label>
          ))
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Message (facultatif)</Label>
        <Input id="message" name="message" maxLength={500} />
      </div>

      {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}

      <Button
        type="submit"
        disabled={pending || matieres.length === 0 || offres.length === 0}
      >
        Envoyer ma demande
      </Button>
    </form>
  );
}
