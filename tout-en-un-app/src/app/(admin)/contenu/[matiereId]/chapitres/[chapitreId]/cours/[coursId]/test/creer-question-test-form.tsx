"use client";

import { useActionState, useState } from "react";
import { creerQuestionTestAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ApercuContenuRiche } from "../apercu-contenu-riche";

const initialState: ActionState = {};

const GABARIT_ENONCE = JSON.stringify(
  { version: 1, noeuds: [{ type: "paragraphe", texte: "Quelle est la nature de l'onde ?" }] },
  null,
  2,
);

// Emplacements fixes (A à E) plutôt qu'une liste d'options ajoutable : voir
// `src/modules/test/service.ts`. Deux emplacements suffisent pour une
// question vrai/faux (A = Vrai, B = Faux, C à E laissés vides).
export function CreerQuestionTestForm({
  matiereId,
  chapitreId,
  coursId,
  testId,
}: {
  matiereId: string;
  chapitreId: string;
  coursId: string;
  testId: string;
}) {
  const [state, formAction, pending] = useActionState(creerQuestionTestAction, initialState);
  const [enonce, setEnonce] = useState(GABARIT_ENONCE);
  const [explication, setExplication] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter une question</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <input type="hidden" name="chapitre_id" value={chapitreId} />
        <input type="hidden" name="cours_id" value={coursId} />
        <input type="hidden" name="test_id" value={testId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-type">Type</Label>
            <select
              id="question-type"
              name="type"
              defaultValue="qcm"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="qcm">QCM</option>
              <option value="vrai_faux">Vrai / Faux</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="question-enonce">Énoncé (contenu riche JSON)</Label>
            <Textarea
              id="question-enonce"
              name="enonce"
              required
              rows={6}
              value={enonce}
              onChange={(evenement) => setEnonce(evenement.target.value)}
            />
            <ApercuContenuRiche valeur={enonce} libelle="l'énoncé" />
          </div>

          <p className="text-xs text-muted-foreground">
            Pour une question vrai/faux, ne renseigne que A (ex. « Vrai ») et B (ex.
            « Faux »), laisse C à E vides.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="question-option-a">Option A</Label>
              <Input id="question-option-a" name="option_a" required maxLength={300} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="question-option-b">Option B</Label>
              <Input id="question-option-b" name="option_b" required maxLength={300} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="question-option-c">Option C (facultative)</Label>
              <Input id="question-option-c" name="option_c" maxLength={300} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="question-option-d">Option D (facultative)</Label>
              <Input id="question-option-d" name="option_d" maxLength={300} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="question-option-e">Option E (facultative)</Label>
              <Input id="question-option-e" name="option_e" maxLength={300} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="question-option-correcte">Option correcte</Label>
              <select
                id="question-option-correcte"
                name="option_correcte"
                defaultValue="a"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
                <option value="e">E</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="question-explication">Explication (facultative)</Label>
            <Textarea
              id="question-explication"
              name="explication"
              rows={4}
              value={explication}
              onChange={(evenement) => setExplication(evenement.target.value)}
            />
            <ApercuContenuRiche valeur={explication} libelle="l'explication" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="question-points">Points</Label>
            <Input id="question-points" name="points" type="number" min={1} max={20} defaultValue={1} />
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
