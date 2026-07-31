// Identification des données laissées par les tests, et calcul de ce qui peut
// être supprimé sans casser une ligne dont l'origine n'est pas établie.
//
// Logique pure : aucune dépendance à Prisma, tout entre par paramètre. C'est ce
// qui permet de la tester sans base et de la relire sans exécuter.

export type Entite =
  | "filiere"
  | "matiere"
  | "chapitre"
  | "cours"
  | "video"
  | "offre"
  | "filiere_matiere";

export interface Ligne {
  id: string;
  libelle: string;
  code?: string;
  cree_le?: string | null;
}

export interface LigneChapitre extends Ligne {
  matiere_id: string;
}
export interface LigneCours extends Ligne {
  chapitre_id: string;
}
export interface LigneVideo extends Ligne {
  cours_id: string;
}
export interface LigneLien {
  id: string;
  filiere_id: string;
  matiere_id: string;
}

export interface Entrees {
  filieres: Ligne[];
  matieres: Ligne[];
  chapitres: LigneChapitre[];
  cours: LigneCours[];
  videos: LigneVideo[];
  offres: Ligne[];
  liens: LigneLien[];
}

export interface Verdict {
  entite: Entite;
  id: string;
  libelle: string;
  raison: string;
}

export interface Classement {
  aSupprimer: Verdict[];
  aConserver: Verdict[];
}

// Les scénarios nomment leurs fixtures avec Date.now(), soit 13 chiffres. Un
// horodatage plausible commence par 1 suivi d'un chiffre de 6 à 9, ce qui couvre
// 2022 à 2065 : assez large pour ne rien manquer, assez étroit pour ne pas
// confondre avec un numéro de chapitre ou une année.
const HORODATAGE = /(?<!\d)(1[6-9]\d{11})(?!\d)/;
const PREFIXE_E2E = /^E2E\b|^E2E[- ]/;

export function dateEmbarquee(...champs: (string | undefined | null)[]): string | null {
  for (const champ of champs) {
    const trouve = champ?.match(HORODATAGE);
    if (trouve) {
      return new Date(Number(trouve[1])).toISOString();
    }
  }
  return null;
}

// Une ligne est reconnue comme donnée de test sur deux critères, et deux
// seulement. Tout le reste est traité comme d'origine non établie, donc conservé.
export function raisonTest(ligne: Ligne): string | null {
  if (ligne.code && PREFIXE_E2E.test(ligne.code)) {
    return `code préfixé E2E (\`${ligne.code}\`)`;
  }
  if (PREFIXE_E2E.test(ligne.libelle)) {
    return "libellé préfixé E2E";
  }
  const date = dateEmbarquee(ligne.code, ligne.libelle);
  if (date) {
    return `horodatage de fixture dans le nom, créée le ${date}`;
  }
  return null;
}

export function classer(entrees: Entrees): Classement {
  const aSupprimer: Verdict[] = [];
  const aConserver: Verdict[] = [];

  const estTest = new Map<string, string>();
  const cle = (entite: Entite, id: string) => `${entite}:${id}`;

  const toutes: [Entite, Ligne[]][] = [
    ["filiere", entrees.filieres],
    ["matiere", entrees.matieres],
    ["chapitre", entrees.chapitres],
    ["cours", entrees.cours],
    ["video", entrees.videos],
    ["offre", entrees.offres],
  ];

  for (const [entite, lignes] of toutes) {
    for (const ligne of lignes) {
      const raison = raisonTest(ligne);
      if (raison) {
        estTest.set(cle(entite, ligne.id), raison);
      }
    }
  }

  // Une ligne non reconnue comme test est protégée, et protège toute sa chaîne
  // de parents : supprimer un parent casserait la clé étrangère qui la porte.
  const protege = new Map<string, string>();

  function proteger(entite: Entite, id: string, raison: string): void {
    const k = cle(entite, id);
    if (protege.has(k)) {
      return;
    }
    protege.set(k, raison);

    if (entite === "video") {
      const video = entrees.videos.find((v) => v.id === id);
      if (video) {
        proteger("cours", video.cours_id, `porte la vidéo « ${video.libelle} », conservée`);
      }
    }
    if (entite === "cours") {
      const cours = entrees.cours.find((c) => c.id === id);
      if (cours) {
        proteger("chapitre", cours.chapitre_id, `contient le cours « ${cours.libelle} », conservé`);
      }
    }
    if (entite === "chapitre") {
      const chapitre = entrees.chapitres.find((c) => c.id === id);
      if (chapitre) {
        proteger(
          "matiere",
          chapitre.matiere_id,
          `contient le chapitre « ${chapitre.libelle} », conservé`,
        );
      }
    }
    if (entite === "matiere") {
      for (const lien of entrees.liens.filter((l) => l.matiere_id === id)) {
        proteger("filiere_matiere", lien.id, "rattache une matière conservée");
        proteger("filiere", lien.filiere_id, "rattachée à une matière conservée");
      }
    }
  }

  for (const [entite, lignes] of toutes) {
    for (const ligne of lignes) {
      if (!estTest.has(cle(entite, ligne.id))) {
        proteger(entite, ligne.id, "origine non établie, aucun marqueur de test");
      }
    }
  }

  // Un lien dont une extrémité est supprimée part avec elle ; un lien dont les
  // deux extrémités restent est conservé.
  for (const lien of entrees.liens) {
    const k = cle("filiere_matiere", lien.id);
    const filiereSupprimee =
      estTest.has(cle("filiere", lien.filiere_id)) &&
      !protege.has(cle("filiere", lien.filiere_id));
    const matiereSupprimee =
      estTest.has(cle("matiere", lien.matiere_id)) &&
      !protege.has(cle("matiere", lien.matiere_id));

    if (protege.has(k)) {
      continue;
    }
    if (filiereSupprimee || matiereSupprimee) {
      estTest.set(k, "rattache une ligne supprimée");
    } else {
      proteger("filiere_matiere", lien.id, "ses deux extrémités sont conservées");
    }
  }

  const libelleLien = (lien: LigneLien) =>
    `filiere ${lien.filiere_id} ↔ matiere ${lien.matiere_id}`;

  const inventaire: [Entite, { id: string; libelle: string }[]][] = [
    ...toutes.map(
      ([entite, lignes]) =>
        [entite, lignes.map((l) => ({ id: l.id, libelle: l.libelle }))] as [
          Entite,
          { id: string; libelle: string }[],
        ],
    ),
    [
      "filiere_matiere",
      entrees.liens.map((l) => ({ id: l.id, libelle: libelleLien(l) })),
    ],
  ];

  for (const [entite, lignes] of inventaire) {
    for (const ligne of lignes) {
      const k = cle(entite, ligne.id);
      const raisonProtection = protege.get(k);
      if (raisonProtection) {
        aConserver.push({ entite, id: ligne.id, libelle: ligne.libelle, raison: raisonProtection });
        continue;
      }
      const raison = estTest.get(k);
      if (raison) {
        aSupprimer.push({ entite, id: ligne.id, libelle: ligne.libelle, raison });
      }
    }
  }

  return { aSupprimer, aConserver };
}

// Ordre de suppression imposé par les clés étrangères. Utilisé par le script de
// ménage et vérifié par un test, pour qu'un ajout de table ne le casse pas
// silencieusement.
export const ORDRE_SUPPRESSION: Entite[] = [
  "video",
  "cours",
  "chapitre",
  "filiere_matiere",
  "matiere",
  "filiere",
  "offre",
];
