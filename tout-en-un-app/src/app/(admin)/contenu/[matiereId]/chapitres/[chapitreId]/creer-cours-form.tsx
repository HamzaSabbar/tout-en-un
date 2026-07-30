"use client";

import { useActionState } from "react";
import { creerCoursAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function CreerCoursForm({ chapitreId }: { chapitreId: string }) {
  const [state, formAction, pending] = useActionState(creerCoursAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau cours</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="chapitre_id" value={chapitreId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" name="titre" required maxLength={150} />
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
