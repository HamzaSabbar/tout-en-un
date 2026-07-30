import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma";

export interface UtilisateurSafe {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
}

export async function getCurrentUser(): Promise<UtilisateurSafe | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await validateSessionToken(token);
  if (!session) {
    return null;
  }

  return {
    id: session.utilisateurId.toString(),
    nom: session.nom,
    prenom: session.prenom,
    email: session.email,
    role: session.role,
  };
}
