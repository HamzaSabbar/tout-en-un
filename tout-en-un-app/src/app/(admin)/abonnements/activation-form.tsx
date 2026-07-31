"use client";

import { useActionState } from "react";
import { activerDemandeAction, type ActionState } from "@/modules/abonnement/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export interface ActivationFormProps {
  utilisateurId: string;
  matiereId: string;
  offreId: string;
  dureeJours: number;
  montant: string;
  demandeId?: string;
  libelleBouton?: string;
}

export function ActivationForm({
  utilisateurId,
  matiereId,
  offreId,
  dureeJours,
  montant,
  demandeId,
  libelleBouton = "Activer",
}: ActivationFormProps) {
  const [state, formAction, pending] = useActionState(
    activerDemandeAction,
    initialState,
  );
  const prefixe = demandeId ?? `${utilisateurId}-${matiereId}`;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="utilisateur_id" value={utilisateurId} />
      <input type="hidden" name="matiere_id" value={matiereId} />
      <input type="hidden" name="offre_id" value={offreId} />
      {demandeId && <input type="hidden" name="demande_id" value={demandeId} />}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`duree-${prefixe}`}>Durée (jours)</Label>
          <Input
            id={`duree-${prefixe}`}
            name="duree_jours"
            type="number"
            min={1}
            defaultValue={dureeJours}
            required
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`montant-${prefixe}`}>Montant</Label>
          <Input
            id={`montant-${prefixe}`}
            name="montant"
            type="number"
            step="0.01"
            min={0}
            defaultValue={montant}
            required
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`reference-${prefixe}`}>Référence de paiement</Label>
          <Input
            id={`reference-${prefixe}`}
            name="reference_paiement"
            required
            className="w-48"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {libelleBouton}
        </Button>
      </div>
      {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}
    </form>
  );
}
