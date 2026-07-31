"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type ActionState } from "@/modules/acces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: ActionState = {};

export interface OptionFiliere {
  id: string;
  libelle: string;
}

export function InscriptionForm({ filieres }: { filieres: OptionFiliere[] }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>Inscris-toi pour accéder à tes matières.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" name="nom" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prenom">Prénom</Label>
            <Input id="prenom" name="prenom" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" name="telephone" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ville">Ville</Label>
            <Input id="ville" name="ville" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="filiere_id">Filière</Label>
            <select
              id="filiere_id"
              name="filiere_id"
              required
              defaultValue=""
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="" disabled>
                Choisis ta filière
              </option>
              {filieres.map((filiere) => (
                <option key={filiere.id} value={filiere.id}>
                  {filiere.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mot_de_passe">Mot de passe</Label>
            <Input
              id="mot_de_passe"
              name="mot_de_passe"
              type="password"
              minLength={10}
              required
            />
          </div>
          {state.erreur && <p className="text-sm text-destructive">{state.erreur}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            Créer mon compte
          </Button>
          <p className="text-sm text-muted-foreground">
            Déjà inscrit ? <Link href="/connexion">Se connecter</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
