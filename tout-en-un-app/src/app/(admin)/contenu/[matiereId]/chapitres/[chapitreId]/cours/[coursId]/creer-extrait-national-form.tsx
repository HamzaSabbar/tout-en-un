"use client";

import { useActionState } from "react";
import { creerExtraitNationalAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

export function CreerExtraitNationalForm({
  matiereId,
  chapitreId,
  coursId,
}: {
  matiereId: string;
  chapitreId: string;
  coursId: string;
}) {
  const [state, formAction, pending] = useActionState(creerExtraitNationalAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un extrait national</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <input type="hidden" name="chapitre_id" value={chapitreId} />
        <input type="hidden" name="cours_id" value={coursId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="extrait-enonce">Énoncé (bref descriptif)</Label>
            <Textarea id="extrait-enonce" name="enonce" required rows={3} maxLength={2000} />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="extrait-annee">Année</Label>
              <Input
                id="extrait-annee"
                name="annee"
                type="number"
                min={2000}
                max={2100}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="extrait-session">Session</Label>
              <select
                id="extrait-session"
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
            <Label htmlFor="extrait-sujet">Sujet (PDF)</Label>
            <Input id="extrait-sujet" name="sujet" type="file" accept="application/pdf" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="extrait-correction">Correction (PDF, facultative)</Label>
            <Input id="extrait-correction" name="correction" type="file" accept="application/pdf" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="extrait-correction-video">
              Référence de la vidéo de correction (facultative)
            </Label>
            <Input
              id="extrait-correction-video"
              name="correction_video_ref"
              placeholder="Identifiant YouTube"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="extrait-difficulte">Difficulté (1 à 5)</Label>
              <Input
                id="extrait-difficulte"
                name="difficulte"
                type="number"
                min={1}
                max={5}
                defaultValue={3}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="extrait-duree">Durée recommandée (minutes, facultative)</Label>
              <Input id="extrait-duree" name="duree_recommandee" type="number" min={1} />
            </div>
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
