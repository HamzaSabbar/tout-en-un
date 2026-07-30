import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeSession, type SessionMeta } from "@/lib/auth/session";
import { connexionSchema, inscriptionSchema } from "@/modules/acces/schemas";

// Hash Argon2id fixe d'un mot de passe factice, comparé quand l'email n'existe
// pas, pour que le temps de réponse ne trahisse pas l'existence d'un compte.
const HASH_FACTICE =
  "$argon2id$v=19$m=19456,t=2,p=1$FaZSW6b81VieseImcvbvJQ$JFjpRBdIj66uGmc6Z5WaSeuXx66vD6mR28+vLfH1MJU";

export interface RegisterResult {
  succes: true;
  id: string;
}

export interface RegisterErreur {
  succes: false;
  erreur: string;
}

export async function register(
  input: unknown,
): Promise<RegisterResult | RegisterErreur> {
  const donnees = inscriptionSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const { nom, prenom, email, telephone, ville, mot_de_passe } = donnees.data;

  try {
    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        ville,
        mot_de_passe_hash: await hashPassword(mot_de_passe),
        role: "eleve",
      },
    });
    return { succes: true, id: utilisateur.id.toString() };
  } catch (erreur) {
    if (
      erreur instanceof Prisma.PrismaClientKnownRequestError &&
      erreur.code === "P2002"
    ) {
      return { succes: false, erreur: "Cet email est déjà utilisé." };
    }
    throw erreur;
  }
}

export interface LoginResult {
  succes: true;
  token: string;
  expireLe: Date;
}

export interface LoginErreur {
  succes: false;
  erreur: string;
}

export async function login(
  input: unknown,
  meta: SessionMeta,
): Promise<LoginResult | LoginErreur> {
  const donnees = connexionSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Identifiants invalides." };
  }

  const { email, mot_de_passe } = donnees.data;
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });

  const motDePasseValide = await verifyPassword(
    utilisateur?.mot_de_passe_hash ?? HASH_FACTICE,
    mot_de_passe,
  );

  if (!utilisateur || !utilisateur.actif || !motDePasseValide) {
    return { succes: false, erreur: "Identifiants invalides." };
  }

  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: { derniere_connexion: new Date() },
  });

  const { token, expireLe } = await createSession(utilisateur.id, meta);
  return { succes: true, token, expireLe };
}

export async function logout(token: string): Promise<void> {
  await revokeSession(token);
}
