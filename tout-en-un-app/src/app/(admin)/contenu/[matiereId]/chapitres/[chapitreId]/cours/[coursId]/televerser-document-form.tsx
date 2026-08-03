"use client";

import { useActionState, useState } from "react";
import { televerserDocumentAction, type ActionState } from "@/modules/contenu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = {};

// `accept` suit le type choisi : le serveur refuse de toute façon un PDF déclaré
// comme image et l'inverse, mais autant ne pas laisser le professeur découvrir la
// règle après le téléversement.
const TYPES_DOCUMENT = [
  { valeur: "cours_pdf", libelle: "Cours (PDF)", accept: "application/pdf" },
  { valeur: "resume_pdf", libelle: "Résumé (PDF)", accept: "application/pdf" },
  { valeur: "correction_pdf", libelle: "Correction (PDF)", accept: "application/pdf" },
  { valeur: "sujet_pdf", libelle: "Sujet (PDF)", accept: "application/pdf" },
  { valeur: "support_live", libelle: "Support de live", accept: "application/pdf" },
  {
    valeur: "image_exercice",
    libelle: "Image d'exercice",
    accept: "image/png,image/jpeg,image/webp",
  },
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
  const [type, setType] = useState(TYPES_DOCUMENT[0]);

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
          {/* Identifiants préfixés : le formulaire de création de vidéo, sur la
              même page, porte aussi un champ « Titre ». Deux éléments d'un même
              identifiant rendent l'association label-champ ambiguë, pour un
              lecteur d'écran comme pour un test. Les attributs `name` ne changent
              pas : c'est eux que lit le serveur. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="document-titre">Titre</Label>
            <Input id="document-titre" name="titre" required maxLength={150} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="document-type">Type</Label>
            <select
              id="document-type"
              name="type"
              required
              value={type.valeur}
              onChange={(evenement) =>
                setType(
                  TYPES_DOCUMENT.find((candidat) => candidat.valeur === evenement.target.value) ??
                    TYPES_DOCUMENT[0],
                )
              }
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
            <Label htmlFor="document-fichier">
              {type.valeur === "image_exercice" ? "Image" : "Fichier PDF"}
            </Label>
            <Input
              id="document-fichier"
              name="fichier"
              type="file"
              accept={type.accept}
              required
            />
            {type.valeur === "image_exercice" && (
              <p className="text-xs text-muted-foreground">
                PNG, JPEG ou WebP, 5 Mo au maximum. Une fois téléversée, reprends
                l&apos;identifiant du fichier dans un nœud <code>image</code> du contenu riche.
              </p>
            )}
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
