import { prisma } from "@/lib/db";

// Toute donnée créée par un test porte ce préfixe, dans le code d'une filière ou
// d'une matière, l'email d'un utilisateur, le libellé d'une offre. Le nettoyage
// s'appuie dessus : il ne supprime jamais une ligne qu'un test n'a pas créée.
export const PREFIXE_E2E = "E2E";

const HOTES_LOCAUX = ["localhost", "127.0.0.1", "::1", "postgres", "db"];

function hoteBase(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// Les tests écrivent et suppriment massivement. Les laisser atteindre la base
// partagée de développement y accumulerait des comptes et du contenu factices,
// et le nettoyage y détruirait du travail réel : c'est arrivé une fois, tous les
// comptes de la base de développement ont été supprimés. On exige donc une base
// locale ou éphémère, comme le service postgres du workflow CI.
//
// La dérogation demande deux confirmations indépendantes, dont une qui nomme
// l'hôte exact. Une variable seule, oubliée dans un profil de shell ou un
// gestionnaire d'environnement, ne peut plus ouvrir la porte à elle seule : la
// seconde cesse de correspondre dès que la base change.
export function exigerBaseDeTest(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL est absent. Les tests de bout en bout ont besoin d'une base " +
        "PostgreSQL dédiée (voir .env.test.example).",
    );
  }

  const hote = hoteBase(url);
  if (HOTES_LOCAUX.includes(hote)) {
    return;
  }

  const premiere = process.env.E2E_BASE_DISTANTE_AUTORISEE === "oui";
  const seconde = process.env.E2E_CONFIRMER_HOTE === hote;

  if (premiere && seconde) {
    console.warn(
      `[e2e] base distante « ${hote} » autorisée par double confirmation. ` +
        "Les scénarios vont y créer puis y supprimer des données.",
    );
    return;
  }

  const manquantes = [
    premiere ? null : "E2E_BASE_DISTANTE_AUTORISEE=oui",
    seconde ? null : `E2E_CONFIRMER_HOTE=${hote}`,
  ].filter((valeur): valeur is string => valeur !== null);

  throw new Error(
    `Les tests de bout en bout refusent de tourner sur la base distante « ${hote} ».\n` +
      "Utilise une base PostgreSQL dédiée : copie .env.test.example vers .env.test,\n" +
      "ou lance `docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`,\n" +
      "puis `npx prisma migrate deploy`.\n" +
      "\n" +
      "Passer outre demande deux confirmations explicites, il en manque " +
      `${manquantes.length} : ${manquantes.join(" et ")}.\n` +
      "Les scénarios suppriment des données sur la base visée : ne fais cela que " +
      "sur une base dont la perte est acceptable.",
  );
}

// Suppression dans l'ordre des dépendances : Prisma n'a pas de cascade ici, et
// l'invariant 8 (pas de suppression physique) vise le contenu de production, pas
// les fixtures d'un test.
export async function nettoyerDonneesE2E(): Promise<void> {
  const commencePar = { startsWith: PREFIXE_E2E };

  const utilisateurs = await prisma.utilisateur.findMany({
    where: { email: { startsWith: PREFIXE_E2E.toLowerCase() } },
    select: { id: true },
  });
  const utilisateurIds = utilisateurs.map((utilisateur) => utilisateur.id);

  const matieres = await prisma.matiere.findMany({
    where: { code: commencePar },
    select: { id: true },
  });
  const matiereIds = matieres.map((matiere) => matiere.id);

  const chapitres = await prisma.chapitre.findMany({
    where: { matiere_id: { in: matiereIds } },
    select: { id: true },
  });
  const chapitreIds = chapitres.map((chapitre) => chapitre.id);

  const coursIds = (
    await prisma.cours.findMany({
      where: { chapitre_id: { in: chapitreIds } },
      select: { id: true },
    })
  ).map((cours) => cours.id);

  await prisma.journalAdmin.deleteMany({
    where: { utilisateur_id: { in: utilisateurIds } },
  });
  await prisma.abonnementMatiere.deleteMany({
    where: {
      OR: [
        { abonnement: { utilisateur_id: { in: utilisateurIds } } },
        { matiere_id: { in: matiereIds } },
      ],
    },
  });
  await prisma.demandeMatiere.deleteMany({
    where: {
      OR: [
        { utilisateur_id: { in: utilisateurIds } },
        { matiere_id: { in: matiereIds } },
      ],
    },
  });
  await prisma.abonnement.deleteMany({
    where: { utilisateur_id: { in: utilisateurIds } },
  });
  await prisma.offre.deleteMany({ where: { libelle: commencePar } });

  await prisma.document.deleteMany({
    where: {
      OR: [
        { matiere_id: { in: matiereIds } },
        { chapitre_id: { in: chapitreIds } },
        { cours_id: { in: coursIds } },
      ],
    },
  });
  await prisma.video.deleteMany({ where: { cours_id: { in: coursIds } } });
  await prisma.cours.deleteMany({ where: { id: { in: coursIds } } });
  await prisma.chapitre.deleteMany({ where: { id: { in: chapitreIds } } });

  await prisma.fichier.deleteMany({
    where: { televerse_par: { in: utilisateurIds } },
  });
  await prisma.sessionUtilisateur.deleteMany({
    where: { utilisateur_id: { in: utilisateurIds } },
  });
  await prisma.jetonReinitialisation.deleteMany({
    where: { utilisateur_id: { in: utilisateurIds } },
  });
  // Les cours d'un professeur de test peuvent pointer vers lui.
  await prisma.cours.updateMany({
    where: { professeur_id: { in: utilisateurIds } },
    data: { professeur_id: null },
  });
  await prisma.utilisateur.deleteMany({ where: { id: { in: utilisateurIds } } });

  await prisma.filiereMatiere.deleteMany({
    where: {
      OR: [{ matiere_id: { in: matiereIds } }, { filiere: { code: commencePar } }],
    },
  });
  await prisma.matiere.deleteMany({ where: { id: { in: matiereIds } } });
  await prisma.filiere.deleteMany({ where: { code: commencePar } });
}

// Compte ce qui reste : sert au test qui vérifie que le nettoyage ne laisse rien.
export async function compterResiduE2E(): Promise<number> {
  const commencePar = { startsWith: PREFIXE_E2E };
  const [utilisateurs, filieres, matieres, offres] = await Promise.all([
    prisma.utilisateur.count({
      where: { email: { startsWith: PREFIXE_E2E.toLowerCase() } },
    }),
    prisma.filiere.count({ where: { code: commencePar } }),
    prisma.matiere.count({ where: { code: commencePar } }),
    prisma.offre.count({ where: { libelle: commencePar } }),
  ]);
  return utilisateurs + filieres + matieres + offres;
}
