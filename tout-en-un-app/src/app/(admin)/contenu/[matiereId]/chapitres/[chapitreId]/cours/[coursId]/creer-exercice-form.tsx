"use client";

import { useActionState, useState } from "react";
import { creerExerciceAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ApercuContenuRiche } from "./apercu-contenu-riche";

const initialState: ActionState = {};

// Gabarit proposé à la première saisie. Il montre les trois formes utiles — texte
// avec formule en ligne, formule en bloc, image par identifiant — plutôt que de
// laisser le professeur deviner la structure attendue.
const GABARIT_ENONCE = JSON.stringify(
  {
    version: 1,
    noeuds: [
      { type: "paragraphe", texte: "Un mobile parcourt $d = 120$ m en 8 s." },
      { type: "formule", latex: "v = \\frac{d}{t}", bloc: true },
    ],
  },
  null,
  2,
);

export function CreerExerciceForm({
  matiereId,
  chapitreId,
  coursId,
}: {
  matiereId: string;
  chapitreId: string;
  coursId: string;
}) {
  const [state, formAction, pending] = useActionState(creerExerciceAction, initialState);
  const [enonce, setEnonce] = useState(GABARIT_ENONCE);
  const [aide, setAide] = useState("");
  const [correction, setCorrection] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un exercice</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <input type="hidden" name="chapitre_id" value={chapitreId} />
        <input type="hidden" name="cours_id" value={coursId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="exercice-titre">Titre</Label>
            <Input id="exercice-titre" name="titre" required maxLength={150} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exercice-enonce">Énoncé (contenu riche JSON)</Label>
            <Textarea
              id="exercice-enonce"
              name="enonce"
              required
              rows={10}
              value={enonce}
              onChange={(evenement) => setEnonce(evenement.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Types de nœuds acceptés : paragraphe, liste, formule, image, code,
              tableau. Les formules en ligne s&apos;écrivent entre dollars,
              l&apos;emphase entre doubles astérisques. Une image porte
              l&apos;identifiant du fichier téléversé, jamais une URL.
            </p>
            <ApercuContenuRiche valeur={enonce} libelle="l'énoncé" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exercice-aide">Aide (facultative)</Label>
            <Textarea
              id="exercice-aide"
              name="aide"
              rows={5}
              value={aide}
              onChange={(evenement) => setAide(evenement.target.value)}
            />
            <ApercuContenuRiche valeur={aide} libelle="l'aide" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exercice-correction">Correction écrite (facultative)</Label>
            <Textarea
              id="exercice-correction"
              name="correction_texte"
              rows={5}
              value={correction}
              onChange={(evenement) => setCorrection(evenement.target.value)}
            />
            <ApercuContenuRiche valeur={correction} libelle="la correction" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exercice-correction-video">
              Référence de la vidéo de correction (facultative)
            </Label>
            <Input
              id="exercice-correction-video"
              name="correction_video_ref"
              placeholder="Identifiant YouTube"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exercice-categorie">Catégorie</Label>
            <select
              id="exercice-categorie"
              name="categorie"
              required
              defaultValue="comprehension"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="comprehension">Exercices de compréhension</option>
              <option value="type_bac">Exercices type bac</option>
              <option value="approfondissement">Exercices d&apos;approfondissement</option>
            </select>
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
