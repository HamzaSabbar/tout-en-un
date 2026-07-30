"use client";

import { useActionState } from "react";
import { televerserDocumentAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

const TYPES_DOCUMENT = [
  { valeur: "cours_pdf", libelle: "Cours (PDF)" },
  { valeur: "resume_pdf", libelle: "Résumé (PDF)" },
  { valeur: "correction_pdf", libelle: "Correction (PDF)" },
  { valeur: "sujet_pdf", libelle: "Sujet (PDF)" },
  { valeur: "support_live", libelle: "Support de live" },
];

export function TeleverserDocumentForm({
  matiereId,
  chapitreId,
  coursId,
}: {
  matiereId: string;
  chapitreId: string;
  coursId: string;
}) {
  const [state, formAction, pending] = useActionState(televerserDocumentAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Téléverser un document</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="matiere_id" value={matiereId} />
        <input type="hidden" name="chapitre_id" value={chapitreId} />
        <input type="hidden" name="cours_id" value={coursId} />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" name="titre" required maxLength={150} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              required
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {TYPES_DOCUMENT.map((type) => (
                <option key={type.valeur} value={type.valeur}>
                  {type.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fichier">Fichier PDF</Label>
            <Input id="fichier" name="fichier" type="file" accept="application/pdf" required />
          </div>
          {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            Téléverser
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
