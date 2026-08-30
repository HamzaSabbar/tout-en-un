"use client";

import { useActionState } from "react";
import { creerChapitreAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function CreerChapitreForm({
  matiereId,
  parties,
}: {
  matiereId: string;
  parties: { id: string; libelle: string }[];
}) {
  const [state, formAction, pending] = useActionState(creerChapitreAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau chapitre</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="libelle">Libellé</Label>
            <Input id="libelle" name="libelle" required maxLength={150} />
          </div>
          {parties.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="partie_id">Partie</Label>
              <select
                id="partie_id"
                name="partie_id"
                defaultValue=""
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Aucune partie</option>
                {parties.map((partie) => (
                  <option key={partie.id} value={partie.id}>
                    {partie.libelle}
                  </option>
                ))}
              </select>
            </div>
          )}
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
