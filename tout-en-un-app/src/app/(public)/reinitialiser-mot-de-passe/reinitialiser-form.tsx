"use client";

import { useActionState } from "react";
import {
  reinitialiserMotDePasseAction,
  type ActionState,
} from "@/modules/acces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";

const initialState: ActionState = {};

export function ReinitialiserForm({ jeton }: { jeton: string }) {
  const [state, formAction, pending] = useActionState(
    reinitialiserMotDePasseAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="jeton" value={jeton} />
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mot_de_passe">Nouveau mot de passe</Label>
          <Input
            id="mot_de_passe"
            name="mot_de_passe"
            type="password"
            minLength={10}
            required
          />
        </div>
        {state.erreur && (
          <p className="text-sm text-destructive">{state.erreur}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" disabled={pending}>
          Choisir ce mot de passe
        </Button>
      </CardFooter>
    </form>
  );
}
