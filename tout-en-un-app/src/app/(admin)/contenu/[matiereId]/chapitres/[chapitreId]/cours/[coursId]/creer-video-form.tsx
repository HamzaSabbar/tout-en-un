"use client";

import { useActionState } from "react";
import { creerVideoAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function CreerVideoForm({ coursId }: { coursId: string }) {
  const [state, formAction, pending] = useActionState(creerVideoAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter une vidéo</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="cours_id" value={coursId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" name="titre" required maxLength={150} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fournisseur">Fournisseur</Label>
            <Input id="fournisseur" name="fournisseur" required defaultValue="youtube" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="video_ref">Référence vidéo</Label>
            <Input id="video_ref" name="video_ref" required placeholder="Identifiant YouTube" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="duree_secondes">Durée (secondes)</Label>
            <Input id="duree_secondes" name="duree_secondes" type="number" min={0} />
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
