"use client";

import { useActionState } from "react";
import { definirDateExamenNationalAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function DefinirDateNationaleForm({
  date,
  libelle,
}: {
  date: string | null;
  libelle: string | null;
}) {
  const [state, formAction, pending] = useActionState(definirDateExamenNationalAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compte à rebours du national</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="libelle">Libellé (ex. Session normale 2027)</Label>
            <Input id="libelle" name="libelle" required maxLength={150} defaultValue={libelle ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Date du national</Label>
            {/* `<Input>` (Base UI) déclenche une erreur d'hydratation React
                sur `type="date"` (attribut `style` qui diffère entre le rendu
                serveur et le client) : élément natif, mêmes classes, plutôt
                que de contourner la bibliothèque pour un seul champ. Même
                motif que le `<select>` de creer-extrait-national-form.tsx. */}
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={date ?? ""}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </div>
          {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            Enregistrer
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
