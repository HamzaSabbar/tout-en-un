"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { login, logout, register } from "@/modules/acces/service";
import { SESSION_COOKIE_NAME, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export interface ActionState {
  erreur?: string;
}

function champsFormulaire(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function metaRequete() {
  const en_tetes = await headers();
  return {
    appareil: en_tetes.get("user-agent") ?? undefined,
    ip: en_tetes.get("x-forwarded-for") ?? undefined,
  };
}

export async function registerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const resultat = await register(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  redirect("/connexion");
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const resultat = await login(champsFormulaire(formData), await metaRequete());
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  await setSessionCookie(resultat.token, resultat.expireLe);
  redirect("/compte");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await logout(token);
  }
  await clearSessionCookie();
  redirect("/connexion");
}
