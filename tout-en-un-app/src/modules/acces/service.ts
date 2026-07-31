import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeSession, type SessionMeta } from "@/lib/auth/session";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from "@/lib/auth/reset-token";
import { envoyerEmail } from "@/lib/mail/mailer";
import {
  connexionSchema,
  demandeReinitialisationSchema,
  inscriptionSchema,
  reinitialisationMotDePasseSchema,
} from "@/modules/acces/schemas";

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

  const { nom, prenom, email, telephone, ville, filiere_id, mot_de_passe } =
    donnees.data;

  const filiere = await prisma.filiere.findFirst({
    where: { id: filiere_id, actif: true },
    select: { id: true },
  });
  if (!filiere) {
    return { succes: false, erreur: "Filière invalide." };
  }

  try {
    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        ville,
        filiere_id: filiere.id,
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

export async function demanderReinitialisation(input: unknown): Promise<void> {
  const donnees = demandeReinitialisationSchema.safeParse(input);
  if (!donnees.success) {
    return;
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { email: donnees.data.email },
  });

  // Ne révèle jamais si un compte existe pour cet email : réponse identique
  // dans tous les cas côté action appelante.
  if (!utilisateur || !utilisateur.actif) {
    return;
  }

  const jeton = generateResetToken();
  await prisma.jetonReinitialisation.create({
    data: {
      utilisateur_id: utilisateur.id,
      jeton_hash: hashResetToken(jeton),
      expire_le: resetTokenExpiry(),
    },
  });

  const lien = `${env.APP_URL}/reinitialiser-mot-de-passe?jeton=${jeton}`;
  await envoyerEmail({
    destinataire: utilisateur.email,
    sujet: "Réinitialisation de votre mot de passe",
    corps: `Clique sur ce lien pour choisir un nouveau mot de passe (valable une heure) : ${lien}`,
  });
}

export interface ReinitialisationResult {
  succes: true;
}

export interface ReinitialisationErreur {
  succes: false;
  erreur: string;
}

export async function reinitialiserMotDePasse(
  input: unknown,
): Promise<ReinitialisationResult | ReinitialisationErreur> {
  const donnees = reinitialisationMotDePasseSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const { jeton, mot_de_passe } = donnees.data;
  const enregistrement = await prisma.jetonReinitialisation.findUnique({
    where: { jeton_hash: hashResetToken(jeton) },
  });

  if (
    !enregistrement ||
    enregistrement.utilise_le !== null ||
    enregistrement.expire_le.getTime() <= Date.now()
  ) {
    return {
      succes: false,
      erreur: "Lien de réinitialisation invalide ou expiré.",
    };
  }

  const motDePasseHash = await hashPassword(mot_de_passe);

  await prisma.$transaction([
    prisma.utilisateur.update({
      where: { id: enregistrement.utilisateur_id },
      data: { mot_de_passe_hash: motDePasseHash },
    }),
    prisma.jetonReinitialisation.update({
      where: { id: enregistrement.id },
      data: { utilise_le: new Date() },
    }),
    prisma.sessionUtilisateur.updateMany({
      where: { utilisateur_id: enregistrement.utilisateur_id },
      data: { revoquee: true },
    }),
  ]);

  return { succes: true };
}
