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

  // Avant les documents : `extrait_national`/`examen_national` référencent des
  // lignes `document` (SET NULL, sans risque), mais leur propre clé étrangère
  // vers `cours` est RESTRICT — sans cette suppression d'abord, la suppression
  // du cours plus bas échouerait (lot 5).
  await prisma.extraitNational.deleteMany({
    where: {
      OR: [
        { matiere_id: { in: matiereIds } },
        { chapitre_id: { in: chapitreIds } },
        { cours_id: { in: coursIds } },
      ],
    },
  });
  await prisma.examenNational.deleteMany({
    where: {
      OR: [{ matiere_id: { in: matiereIds } }, { filiere: { code: commencePar } }],
    },
  });

  await prisma.document.deleteMany({
    where: {
      OR: [
        { matiere_id: { in: matiereIds } },
        { chapitre_id: { in: chapitreIds } },
        { cours_id: { in: coursIds } },
      ],
    },
  });
  // Le journal d'apprentissage part avant les exercices et les utilisateurs qu'il
  // référence. Il est supprimé sur les deux critères : les événements d'un compte
  // de test, et ceux qui visent une matière de test, pour qu'un compte réel ayant
  // touché une fixture ne laisse pas de ligne orpheline.
  await prisma.evenementApprentissage.deleteMany({
    where: {
      OR: [
        { utilisateur_id: { in: utilisateurIds } },
        { matiere_id: { in: matiereIds } },
      ],
    },
  });
  // Avant les cours : `test` (RESTRICT sur `cours_id`) et toute sa chaîne
  // enfant doivent être vidés avant `cours.deleteMany` plus bas (lot 6).
  // `tentative_test` référence aussi `utilisateur` (RESTRICT), donc cette
  // suppression doit aussi précéder `utilisateur.deleteMany`.
  const testsQcm = await prisma.test.findMany({
    where: { cours_id: { in: coursIds } },
    select: { id: true },
  });
  const testIds = testsQcm.map((testQcm) => testQcm.id);
  const questionsTest = await prisma.questionTest.findMany({
    where: { test_id: { in: testIds } },
    select: { id: true },
  });
  const questionTestIds = questionsTest.map((question) => question.id);
  await prisma.reponseTentative.deleteMany({
    where: { question_test_id: { in: questionTestIds } },
  });
  await prisma.tentativeTest.deleteMany({ where: { test_id: { in: testIds } } });
  await prisma.optionReponse.deleteMany({
    where: { question_test_id: { in: questionTestIds } },
  });
  await prisma.questionTest.deleteMany({ where: { test_id: { in: testIds } } });
  await prisma.test.deleteMany({ where: { id: { in: testIds } } });

  await prisma.exercice.deleteMany({ where: { cours_id: { in: coursIds } } });
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
  // `chapitre.partie_id` est SET NULL (aucun risque à supprimer une partie
  // référencée), mais `partie.matiere_id` est RESTRICT : sans cette ligne, la
  // suppression de la matière plus bas échoue si elle porte encore une partie.
  await prisma.partie.deleteMany({ where: { matiere_id: { in: matiereIds } } });
  await prisma.matiere.deleteMany({ where: { id: { in: matiereIds } } });
  await prisma.filiere.deleteMany({ where: { code: commencePar } });
}

// Compte ce qui reste : sert au test qui vérifie que le nettoyage ne laisse rien.
// `fichier` et `document` en font partie depuis qu'un scénario téléverse par le
// back-office : sans eux, une ligne de fichier oubliée passait inaperçue. Les
// exercices et le journal d'apprentissage s'y ajoutent au lot 4, pour la même
// raison : un compteur qui ignore une table donne une fausse assurance.
export async function compterResiduE2E(): Promise<number> {
  const commencePar = { startsWith: PREFIXE_E2E };
  // `evenement_apprentissage.matiere_id` n'est pas une clé étrangère : le journal
  // est un registre de faits, il survit volontairement au contenu qu'il cite. Il
  // n'y a donc pas de relation à parcourir, il faut les identifiants.
  const matiereIdsE2E = (
    await prisma.matiere.findMany({ where: { code: commencePar }, select: { id: true } })
  ).map((matiere) => matiere.id);

  const [
    utilisateurs,
    filieres,
    matieres,
    offres,
    fichiers,
    documents,
    exercices,
    evenements,
    extraitsNationaux,
    examensNationaux,
    parties,
    tests,
  ] = await Promise.all([
    prisma.utilisateur.count({
      where: { email: { startsWith: PREFIXE_E2E.toLowerCase() } },
    }),
    prisma.filiere.count({ where: { code: commencePar } }),
    prisma.matiere.count({ where: { code: commencePar } }),
    prisma.offre.count({ where: { libelle: commencePar } }),
    prisma.fichier.count({ where: { nom: commencePar } }),
    prisma.document.count({ where: { titre: commencePar } }),
    prisma.exercice.count({ where: { titre: commencePar } }),
    prisma.evenementApprentissage.count({
      where: { matiere_id: { in: matiereIdsE2E } },
    }),
    // Ni l'un ni l'autre ne porte de champ « titre » à préfixer : rattachés à
    // une matière de test par construction (lot 5).
    prisma.extraitNational.count({ where: { matiere_id: { in: matiereIdsE2E } } }),
    prisma.examenNational.count({
      where: { OR: [{ matiere_id: { in: matiereIdsE2E } }, { filiere: { code: commencePar } }] },
    }),
    // Pas de champ « libelle » préfixable de façon fiable ici non plus :
    // rattachée à une matière de test par construction, comme les deux
    // précédentes.
    prisma.partie.count({ where: { matiere_id: { in: matiereIdsE2E } } }),
    // `test` n'a pas de `matiere_id` direct (seulement `cours_id`) : rattaché
    // à une matière de test par construction, même motif (lot 6).
    prisma.test.count({ where: { cours: { chapitre: { matiere_id: { in: matiereIdsE2E } } } } }),
  ]);
  return (
    utilisateurs +
    filieres +
    matieres +
    offres +
    fichiers +
    documents +
    exercices +
    evenements +
    extraitsNationaux +
    examensNationaux +
    parties +
    tests
  );
}
