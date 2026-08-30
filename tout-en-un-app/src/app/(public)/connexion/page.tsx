"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import { loginAction, type ActionState } from "@/modules/acces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

// Motifs discrets (orbites, onde, symboles mathématiques) en aplat blanc très
// transparent sur le bleu de marque : une identité Tout en Un, pas un clipart.
function IllustrationConnexion() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-16 -top-16 size-72 rounded-full border border-white/10" />
      <div className="absolute -right-4 top-28 size-40 rounded-full border border-white/15" />
      <div className="absolute -bottom-10 -left-12 size-64 rounded-full border border-white/10" />
      <span className="absolute right-14 top-1/3 text-8xl font-bold text-white/10">π</span>
      <span className="absolute bottom-28 left-12 text-6xl font-bold text-white/10">Σ</span>
      <span className="absolute bottom-1/4 right-1/3 text-7xl font-bold text-white/[0.08]">√</span>
      <svg
        className="absolute inset-x-10 bottom-1/3 h-20 w-2/3 text-white/15"
        viewBox="0 0 400 100"
        fill="none"
      >
        <path
          d="M0 50 C 50 0, 100 100, 150 50 S 250 0, 300 50 S 400 0, 400 50"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export default function ConnexionPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  return (
    <div className="grid min-h-screen lg:grid-cols-[55fr_45fr]">
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <IllustrationConnexion />
        <Link href="/connexion" className="relative z-10 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <GraduationCap aria-hidden="true" className="size-5" />
          </span>
          <span className="text-body font-bold">Tout en Un</span>
        </Link>
        <div className="relative z-10 max-w-md space-y-3">
          <h1 className="text-display font-bold leading-tight">
            Tout ce qu&apos;il te faut pour réussir.
          </h1>
          <p className="text-body text-primary-foreground/80">
            Cours, exercices, lives et ressources réunis au même endroit.
          </p>
        </div>
        <div />
      </div>

      <div className="flex min-h-screen items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link href="/connexion" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap aria-hidden="true" className="size-5" />
            </span>
            <span className="text-body font-bold">Tout en Un</span>
          </Link>

          <h2 className="text-h2 font-bold tracking-tight">Content de te revoir 👋</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Connecte-toi pour reprendre ta progression.
          </p>

          <form action={formAction} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="h-11" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mot_de_passe">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="mot_de_passe"
                  name="mot_de_passe"
                  type={motDePasseVisible ? "text" : "password"}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMotDePasseVisible((v) => !v)}
                  aria-label={motDePasseVisible ? "Masquer la saisie" : "Afficher la saisie"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {motDePasseVisible ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {state.erreur && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
                {state.erreur}
              </p>
            )}

            <Button type="submit" className="h-11 w-full text-body-sm" disabled={pending}>
              {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              Se connecter
            </Button>

            <Link
              href="/mot-de-passe-oublie"
              className="text-center text-body-sm text-muted-foreground hover:text-foreground"
            >
              Mot de passe oublié ?
            </Link>
          </form>

          <div className="my-6 border-t" />

          <p className="text-center text-body-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-medium text-primary hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
