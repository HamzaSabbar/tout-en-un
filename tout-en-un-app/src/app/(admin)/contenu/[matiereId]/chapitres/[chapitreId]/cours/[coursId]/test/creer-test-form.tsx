"use client";

import { useActionState } from "react";
import { creerTestAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function CreerTestForm({
  matiereId,
  chapitreId,
  coursId,
}: {
  matiereId: string;
  chapitreId: string;
  coursId: string;
}) {
  const [state, formAction, pending] = useActionState(creerTestAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer le test de ce cours</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <input type="hidden" name="chapitre_id" value={chapitreId} />
        <input type="hidden" name="cours_id" value={coursId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="test-titre">Titre</Label>
            <Input id="test-titre" name="titre" required maxLength={150} defaultValue="Teste ta compréhension du cours" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="test-consigne">Consigne (facultative)</Label>
            <Textarea id="test-consigne" name="consigne" rows={3} maxLength={2000} />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="test-duree">Durée (minutes)</Label>
              <Input id="test-duree" name="duree_minutes" type="number" min={1} max={180} required defaultValue={15} />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="test-seuil">Seuil de validation (%)</Label>
              <Input id="test-seuil" name="seuil_validation" type="number" min={0} max={100} defaultValue={50} />
            </div>
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
