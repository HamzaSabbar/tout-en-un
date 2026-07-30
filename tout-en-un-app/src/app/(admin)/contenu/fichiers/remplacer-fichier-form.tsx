"use client";

import { useActionState } from "react";
import { remplacerFichierAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ActionState = {};

export function RemplacerFichierForm({ fichierId }: { fichierId: string }) {
  const [state, formAction, pending] = useActionState(remplacerFichierAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="fichier_id" value={fichierId} />
      <Input
        name="fichier"
        type="file"
        accept="application/pdf"
        required
        className="h-8 max-w-56 text-xs"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Remplacer
      </Button>
      {state.erreur && <p className="text-xs text-destructive">{state.erreur}</p>}
    </form>
  );
}
