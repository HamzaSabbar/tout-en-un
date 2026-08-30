"use client";

import { useActionState } from "react";
import { creerPartieAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function CreerPartieForm({ matiereId }: { matiereId: string }) {
  const [state, formAction, pending] = useActionState(creerPartieAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle partie</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="partie-libelle">Nom de la partie</Label>
            <Input id="partie-libelle" name="libelle" required maxLength={150} />
          </div>
          {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            Ajouter
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
