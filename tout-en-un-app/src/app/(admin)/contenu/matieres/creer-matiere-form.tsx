"use client";

import { useActionState } from "react";
import { creerMatiereAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function CreerMatiereForm() {
  const [state, formAction, pending] = useActionState(creerMatiereAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle matière</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" required maxLength={20} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="libelle">Libellé</Label>
            <Input id="libelle" name="libelle" required maxLength={100} />
          </div>
          {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            Créer
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
