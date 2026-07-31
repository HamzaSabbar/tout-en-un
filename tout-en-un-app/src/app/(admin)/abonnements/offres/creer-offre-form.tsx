"use client";

import { useActionState } from "react";
import { creerOffreAction, type ActionState } from "@/modules/abonnement/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function CreerOffreForm() {
  const [state, formAction, pending] = useActionState(creerOffreAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="libelle">Libellé</Label>
          <Input id="libelle" name="libelle" required className="w-56" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="duree_jours">Durée (jours)</Label>
          <Input
            id="duree_jours"
            name="duree_jours"
            type="number"
            min={1}
            required
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="nb_matieres">Nb matières</Label>
          <Input
            id="nb_matieres"
            name="nb_matieres"
            type="number"
            min={1}
            required
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="prix">Prix (MAD)</Label>
          <Input
            id="prix"
            name="prix"
            type="number"
            step="0.01"
            min={0}
            required
            className="w-28"
          />
        </div>
        <Button type="submit" disabled={pending}>
          Créer
        </Button>
      </div>
      {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}
    </form>
  );
}
