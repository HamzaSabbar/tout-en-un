import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME };
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

export interface SessionMeta {
  appareil?: string;
  ip?: string;
}

export interface ValidatedSession {
  utilisateurId: bigint;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  utilisateurId: bigint,
  meta: SessionMeta,
): Promise<{ token: string; expireLe: Date }> {
  const token = generateSessionToken();
  const expireLe = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.sessionUtilisateur.create({
    data: {
      utilisateur_id: utilisateurId,
      jeton_hash: hashSessionToken(token),
      appareil: meta.appareil,
      ip: meta.ip,
      expire_le: expireLe,
    },
  });

  return { token, expireLe };
}

export async function validateSessionToken(
  token: string,
): Promise<ValidatedSession | null> {
  const jetonHash = hashSessionToken(token);

  const session = await prisma.sessionUtilisateur.findUnique({
    where: { jeton_hash: jetonHash },
    include: { utilisateur: true },
  });

  if (!session || session.revoquee || !session.utilisateur.actif) {
    return null;
  }

  const now = Date.now();
  if (session.expire_le.getTime() <= now) {
    return null;
  }

  if (session.expire_le.getTime() - now < SESSION_RENEW_THRESHOLD_MS) {
    await prisma.sessionUtilisateur.update({
      where: { id: session.id },
      data: { expire_le: new Date(now + SESSION_DURATION_MS) },
    });
  }

  return {
    utilisateurId: session.utilisateur.id,
    nom: session.utilisateur.nom,
    prenom: session.utilisateur.prenom,
    email: session.utilisateur.email,
    role: session.utilisateur.role,
  };
}

export async function revokeSession(token: string): Promise<void> {
  const jetonHash = hashSessionToken(token);
  await prisma.sessionUtilisateur.updateMany({
    where: { jeton_hash: jetonHash },
    data: { revoquee: true },
  });
}

export async function setSessionCookie(
  token: string,
  expireLe: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expireLe,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
