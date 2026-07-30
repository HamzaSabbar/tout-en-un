"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  demanderReinitialisationAction,
  type DemandeReinitialisationState,
} from "@/modules/acces/actions";
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

const initialState: DemandeReinitialisationState = {};

export default function MotDePasseOubliePage() {
  const [state, formAction, pending] = useActionState(
    demanderReinitialisationAction,
    initialState,
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>
            Indique ton email, un lien de réinitialisation te sera envoyé.
          </CardDescription>
        </CardHeader>
        {state.envoye ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Si un compte existe pour cet email, un lien de réinitialisation
              vient d&apos;être envoyé. Il est valable une heure.
            </p>
          </CardContent>
        ) : (
          <form action={formAction}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={pending}>
                Envoyer le lien
              </Button>
              <p className="text-sm text-muted-foreground">
                <Link href="/connexion">Retour à la connexion</Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
