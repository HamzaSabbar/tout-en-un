import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { hashPassword } from "../src/lib/auth/password.ts";

// Recrée, ou remet en état, le compte administrateur d'un environnement de
// développement. Idempotent : deux exécutions successives laissent exactement le
// même état, et la seconde ne change pas le mot de passe déjà en place.
//
//   ADMIN_EMAIL=... ADMIN_MOT_DE_PASSE=... node prisma/seed-admin.ts
//
// Le mot de passe n'est jamais écrit dans le code ni dans le dépôt : il vient de
// l'environnement. Sans ADMIN_MOT_DE_PASSE, le script en génère un aléatoire et
// l'affiche une seule fois.
//
// Imports relatifs volontaires : ce script tourne hors du bundler Next, qui seul
// résout l'alias `@/`. Il n'utilise donc pas src/lib/db.ts, mais réutilise le
// hachage de src/lib/auth/password.ts pour que la règle Argon2id reste unique.

const EMAIL_PAR_DEFAUT = "admin@dev.local";

function urlBase(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL ou DATABASE_URL est requis (voir .env.example).");
  }
  return url;
}

function motDePasseFourni(): { valeur: string; genere: boolean } {
  const fourni = process.env.ADMIN_MOT_DE_PASSE;
  if (fourni) {
    if (fourni.length < 10) {
      throw new Error("ADMIN_MOT_DE_PASSE doit faire au moins 10 caractères.");
    }
    return { valeur: fourni, genere: false };
  }
  // 32 octets en base64url : au-delà de ce que l'on retiendrait de tête, donc
  // affiché une fois puis à stocker dans un gestionnaire de mots de passe.
  const aleatoire = crypto.getRandomValues(new Uint8Array(24));
  const valeur = Buffer.from(aleatoire).toString("base64url");
  return { valeur, genere: true };
}

async function principal(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? EMAIL_PAR_DEFAUT).trim().toLowerCase();
  const adapter = new PrismaPg({ connectionString: urlBase() });
  const prisma = new PrismaClient({ adapter });

  try {
    const existant = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, role: true, actif: true },
    });

    if (existant) {
      // Idempotence : le compte existe déjà. On ne retouche ni son mot de passe
      // ni ses autres champs, on garantit seulement qu'il est admin et actif.
      const aCorriger =
        existant.role !== "admin" || !existant.actif
          ? await prisma.utilisateur.update({
              where: { id: existant.id },
              data: { role: "admin", actif: true },
              select: { id: true },
            })
          : null;

      console.log(
        aCorriger
          ? `Compte ${email} existait déjà : rôle et activation remis à admin/actif.`
          : `Compte ${email} déjà conforme, rien à faire.`,
      );
      console.log(`identifiant : ${existant.id}`);
      return;
    }

    const { valeur, genere } = motDePasseFourni();
    const cree = await prisma.utilisateur.create({
      data: {
        nom: "Admin",
        prenom: "Développement",
        email,
        telephone: process.env.ADMIN_TELEPHONE ?? "0600000000",
        mot_de_passe_hash: await hashPassword(valeur),
        role: "admin",
        actif: true,
      },
      select: { id: true },
    });

    console.log(`Compte admin créé : ${email}`);
    console.log(`identifiant : ${cree.id}`);
    if (genere) {
      console.log("");
      console.log("Mot de passe généré, affiché une seule fois :");
      console.log(`  ${valeur}`);
      console.log("Note-le maintenant, il n'est pas récupérable ensuite.");
    } else {
      console.log("Mot de passe : celui fourni via ADMIN_MOT_DE_PASSE.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
