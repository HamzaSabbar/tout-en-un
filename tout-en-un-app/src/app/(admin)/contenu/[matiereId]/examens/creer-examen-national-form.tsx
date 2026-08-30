"use client";

import { useActionState } from "react";
import { creerExamenNationalAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

interface Filiere {
  id: bigint;
  libelle: string;
}

export function CreerExamenNationalForm({
  matiereId,
  filieres,
}: {
  matiereId: string;
  filieres: Filiere[];
}) {
  const [state, formAction, pending] = useActionState(creerExamenNationalAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un examen national</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="examen-filiere">Filière</Label>
            <select
              id="examen-filiere"
              name="filiere_id"
              required
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {filieres.map((filiere) => (
                <option key={filiere.id.toString()} value={filiere.id.toString()}>
                  {filiere.libelle}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="examen-annee">Année</Label>
              <Input
                id="examen-annee"
                name="annee"
                type="number"
                min={2000}
                max={2100}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="examen-session">Session</Label>
              <select
                id="examen-session"
                name="session"
                required
                defaultValue="normale"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="normale">Normale</option>
                <option value="rattrapage">Rattrapage</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="examen-sujet">Sujet (PDF)</Label>
            <Input id="examen-sujet" name="sujet" type="file" accept="application/pdf" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="examen-correction">Correction (PDF, facultative)</Label>
            <Input id="examen-correction" name="correction" type="file" accept="application/pdf" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="examen-correction-video">
              Référence de la vidéo de correction (facultative)
            </Label>
            <Input
              id="examen-correction-video"
              name="correction_video_ref"
              placeholder="Identifiant YouTube"
            />
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
